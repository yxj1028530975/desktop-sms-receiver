from contextlib import asynccontextmanager
from datetime import datetime, timezone
import json
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path
from time import perf_counter
import traceback

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy import inspect, text

from app.api.routes.admin import router as admin_router
from app.api.routes.messages import router as message_router
from app.api.routes.realtime import router as realtime_router
from app.config import get_settings
from app.database import Base, SessionLocal, engine
from app.services.notification_hub import notification_hub
settings = get_settings()
REQUEST_LOGGER_NAME = "sms_backend.requests"
REQUEST_LOG_FILE = "request-events.jsonl"


def ensure_sqlite_directory() -> None:
    if not settings.database_url.startswith("sqlite:///"):
        return

    raw_path = settings.database_url.removeprefix("sqlite:///")
    database_path = Path(raw_path)
    database_path.parent.mkdir(parents=True, exist_ok=True)


def ensure_log_directory() -> Path:
    log_dir = Path(settings.log_dir)
    log_dir.mkdir(parents=True, exist_ok=True)
    return log_dir


def setup_request_logger() -> logging.Logger:
    logger = logging.getLogger(REQUEST_LOGGER_NAME)
    logger.setLevel(logging.INFO)
    logger.propagate = False

    log_path = ensure_log_directory() / REQUEST_LOG_FILE
    handler = RotatingFileHandler(log_path, maxBytes=1_500_000, backupCount=5, encoding="utf-8")
    handler.setFormatter(logging.Formatter("%(message)s"))

    logger.handlers.clear()
    logger.addHandler(handler)
    return logger


request_logger = setup_request_logger()


def run_startup_migrations() -> None:
    inspector = inspect(engine)
    if "desktop_clients" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("desktop_clients")}
    statements: list[str] = []

    if "access_token" not in existing_columns:
        statements.append("ALTER TABLE desktop_clients ADD COLUMN access_token VARCHAR(128)")
    if "enabled" not in existing_columns:
        statements.append("ALTER TABLE desktop_clients ADD COLUMN enabled BOOLEAN NOT NULL DEFAULT 1")

    if statements:
        with engine.begin() as connection:
            for statement in statements:
                connection.execute(text(statement))


def should_log_request(path: str) -> bool:
    return path == "/health" or path.startswith("/api/")


def sanitize_headers(request: Request) -> dict[str, str]:
    visible_headers = {
        "content-type": request.headers.get("content-type"),
        "user-agent": request.headers.get("user-agent"),
        "x-forwarded-for": request.headers.get("x-forwarded-for"),
        "cf-connecting-ip": request.headers.get("cf-connecting-ip"),
    }
    return {key: value for key, value in visible_headers.items() if value}


def trim_text(value: str, limit: int = 2000) -> str:
    if len(value) <= limit:
        return value
    return f"{value[:limit]}...(truncated)"


def extract_request_body(content_type: str | None, body: bytes) -> object | None:
    if not body:
        return None

    lowered_content_type = (content_type or "").lower()
    text_body = trim_text(body.decode("utf-8", errors="replace"))

    if "application/json" in lowered_content_type:
        try:
            return json.loads(text_body)
        except json.JSONDecodeError:
            return text_body

    if lowered_content_type.startswith("text/") or "application/x-www-form-urlencoded" in lowered_content_type:
        return text_body

    return f"<{len(body)} bytes>"


async def clone_error_response(response: Response) -> tuple[Response, object | None]:
    if response.status_code < 400:
        return response, None

    content_type = response.headers.get("content-type", "").lower()
    if "application/json" not in content_type:
        return response, None

    body = b""
    async for chunk in response.body_iterator:
        body += chunk

    headers = dict(response.headers)
    headers.pop("content-length", None)
    cloned_response = Response(
        content=body,
        status_code=response.status_code,
        headers=headers,
        media_type=response.media_type,
        background=response.background,
    )

    if not body:
        return cloned_response, None

    try:
        detail = json.loads(body.decode("utf-8"))
    except json.JSONDecodeError:
        detail = trim_text(body.decode("utf-8", errors="replace"))
    return cloned_response, detail


def write_request_log(entry: dict[str, object]) -> None:
    request_logger.info(json.dumps(entry, ensure_ascii=False))


@asynccontextmanager
async def lifespan(_: FastAPI):
    ensure_sqlite_directory()
    ensure_log_directory()
    Base.metadata.create_all(bind=engine)
    run_startup_migrations()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.admin_session_secret,
    same_site="lax",
    session_cookie="sms-admin-session",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    if not should_log_request(request.url.path):
        return await call_next(request)

    raw_body = await request.body()
    if raw_body:
        async def receive() -> dict[str, object]:
            return {"type": "http.request", "body": raw_body, "more_body": False}

        request._receive = receive  # type: ignore[attr-defined]

    started_at = perf_counter()
    base_log = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "method": request.method,
        "path": request.url.path,
        "query": dict(request.query_params),
        "client_ip": request.headers.get("cf-connecting-ip")
        or request.headers.get("x-forwarded-for")
        or (request.client.host if request.client else None),
        "headers": sanitize_headers(request),
        "request_body": extract_request_body(request.headers.get("content-type"), raw_body),
    }

    try:
        response = await call_next(request)
    except Exception as exc:
        write_request_log(
            {
                **base_log,
                "status_code": 500,
                "duration_ms": round((perf_counter() - started_at) * 1000, 2),
                "level": "error",
                "response_detail": {
                    "type": exc.__class__.__name__,
                    "message": str(exc),
                    "traceback": trim_text(traceback.format_exc(), limit=4000),
                },
            }
        )
        raise

    response, response_detail = await clone_error_response(response)
    write_request_log(
        {
            **base_log,
            "status_code": response.status_code,
            "duration_ms": round((perf_counter() - started_at) * 1000, 2),
            "level": "error" if response.status_code >= 400 else "info",
            "response_detail": response_detail,
        }
    )
    return response


app.include_router(message_router)
app.include_router(realtime_router)
app.include_router(admin_router)


@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "app": settings.app_name,
        "environment": settings.environment,
        "online_clients": await notification_hub.online_count(),
    }
