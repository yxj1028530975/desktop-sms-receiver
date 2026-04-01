from pathlib import Path
import json

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.security import verify_admin_access
from app.config import get_settings
from app.database import get_db
from app.models import DesktopClient, SmsDelivery, SmsRouteBinding
from app.schemas import (
    AdminLoginPayload,
    AdminOverviewResponse,
    AdminSessionRead,
    DesktopClientCreate,
    DesktopClientRead,
    DesktopClientTokenRead,
    DesktopClientUpdate,
    SmsRouteBindingCreate,
    SmsRouteBindingRead,
    SmsRouteBindingUpdate,
)
from app.services.notification_hub import notification_hub
from app.services.parser import normalize_phone
from app.services.routing import (
    create_desktop_client,
    regenerate_desktop_client_token,
    route_binding_counts,
    upsert_route_binding,
)


router = APIRouter(tags=["admin"])
settings = get_settings()
ADMIN_PAGE_PATH = Path(__file__).with_name("admin_page.html")
ADMIN_ASSET_DIR = Path(__file__).parent
REQUEST_LOG_PATH = Path(settings.log_dir) / "request-events.jsonl"


def ensure_client_token(db: Session, client: DesktopClient) -> DesktopClient:
    return client if client.access_token else regenerate_desktop_client_token(db, client)


async def build_overview(db: Session) -> AdminOverviewResponse:
    online_connections = await notification_hub.list_connections()
    online_map = {connection.client_id: connection for connection in online_connections}
    binding_counts = route_binding_counts(db)

    clients = list(
        db.scalars(
            select(DesktopClient).order_by(
                DesktopClient.last_seen_at.desc().nullslast(),
                DesktopClient.display_name.asc(),
                DesktopClient.client_id.asc(),
            )
        )
    )
    bindings = list(
        db.scalars(
            select(SmsRouteBinding).order_by(
                SmsRouteBinding.normalized_receiver.asc(),
                SmsRouteBinding.client_id.asc(),
            )
        )
    )

    phones_by_client: dict[str, list[str]] = {}
    for binding in bindings:
        phones_by_client.setdefault(binding.client_id, []).append(binding.normalized_receiver)

    client_map = {client.client_id: client for client in clients}
    client_items = [
        DesktopClientRead(
            client_id=stable_client.client_id,
            access_token=stable_client.access_token,
            display_name=stable_client.display_name,
            note=stable_client.note,
            enabled=stable_client.enabled,
            is_online=stable_client.client_id in online_map,
            connected_at=online_map[stable_client.client_id].connected_at if stable_client.client_id in online_map else None,
            last_seen_at=stable_client.last_seen_at,
            binding_count=binding_counts.get(stable_client.client_id, 0),
            phone_numbers=phones_by_client.get(stable_client.client_id, []),
        )
        for stable_client in (ensure_client_token(db, client) for client in clients)
    ]
    binding_items = [
        SmsRouteBindingRead(
            id=binding.id,
            phone_number=binding.normalized_receiver,
            normalized_receiver=binding.normalized_receiver,
            client_id=binding.client_id,
            client_display_name=client_map.get(binding.client_id).display_name if client_map.get(binding.client_id) else None,
            client_online=binding.client_id in online_map,
            enabled=binding.enabled,
            note=binding.note,
            created_at=binding.created_at,
            updated_at=binding.updated_at,
        )
        for binding in bindings
    ]
    return AdminOverviewResponse(clients=client_items, bindings=binding_items)


def build_client_read(db: Session, client: DesktopClient) -> DesktopClientRead:
    stable_client = ensure_client_token(db, client)
    phones = list(
        db.scalars(
            select(SmsRouteBinding.normalized_receiver).where(SmsRouteBinding.client_id == stable_client.client_id)
        )
    )
    return DesktopClientRead(
        client_id=stable_client.client_id,
        access_token=stable_client.access_token,
        display_name=stable_client.display_name,
        note=stable_client.note,
        enabled=stable_client.enabled,
        is_online=False,
        connected_at=None,
        last_seen_at=stable_client.last_seen_at,
        binding_count=len(phones),
        phone_numbers=phones,
    )


def build_binding_read(binding: SmsRouteBinding, client: DesktopClient | None, online_ids: set[str]) -> SmsRouteBindingRead:
    return SmsRouteBindingRead(
        id=binding.id,
        phone_number=binding.normalized_receiver,
        normalized_receiver=binding.normalized_receiver,
        client_id=binding.client_id,
        client_display_name=client.display_name if client else None,
        client_online=binding.client_id in online_ids,
        enabled=binding.enabled,
        note=binding.note,
        created_at=binding.created_at,
        updated_at=binding.updated_at,
    )


def read_request_logs(
    limit: int,
    *,
    level: str | None = None,
    path: str | None = None,
    status: int | None = None,
) -> list[dict]:
    if not REQUEST_LOG_PATH.exists():
        return []

    items: list[dict] = []
    expected_level = level.strip().lower() if level else None
    expected_path = path.strip() if path else None
    with REQUEST_LOG_PATH.open("r", encoding="utf-8") as file:
        for line in reversed(file.readlines()):
            raw_line = line.strip()
            if not raw_line:
                continue
            try:
                item = json.loads(raw_line)
            except json.JSONDecodeError:
                item = {
                    "timestamp": None,
                    "method": "LOG",
                    "path": "parse-error",
                    "status_code": 0,
                    "level": "error",
                    "duration_ms": None,
                    "response_detail": {"message": raw_line},
                }

            item_level = str(item.get("level", "")).lower()
            item_path = str(item.get("path", ""))
            item_status = item.get("status_code")

            if expected_level and item_level != expected_level:
                continue
            if expected_path and expected_path not in item_path:
                continue
            if status is not None and item_status != status:
                continue

            items.append(item)
            if len(items) >= limit:
                break
    return items


@router.get("/admin", response_class=HTMLResponse, include_in_schema=False)
async def admin_page() -> HTMLResponse:
    return HTMLResponse(ADMIN_PAGE_PATH.read_text(encoding="utf-8"))


@router.get("/admin/assets/{asset_name}", include_in_schema=False)
async def admin_asset(asset_name: str) -> FileResponse:
    if asset_name not in {"admin_page.css", "admin_page.js"}:
        raise HTTPException(status_code=404, detail="Asset not found.")
    asset_path = ADMIN_ASSET_DIR / asset_name
    if not asset_path.exists():
        raise HTTPException(status_code=404, detail="Asset not found.")
    media_type = "text/css" if asset_name.endswith(".css") else "application/javascript"
    return FileResponse(asset_path, media_type=media_type)


@router.get("/api/admin/session", response_model=AdminSessionRead)
def admin_session(request: Request) -> AdminSessionRead:
    authenticated = request.session.get("admin_authenticated") is True
    return AdminSessionRead(
        authenticated=authenticated,
        username=request.session.get("admin_username") if authenticated else None,
    )


@router.post("/api/admin/login", response_model=AdminSessionRead)
def admin_login(payload: AdminLoginPayload, request: Request) -> AdminSessionRead:
    if payload.username != settings.admin_username or payload.password != settings.admin_password:
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    request.session["admin_authenticated"] = True
    request.session["admin_username"] = settings.admin_username
    return AdminSessionRead(authenticated=True, username=settings.admin_username)


@router.post("/api/admin/logout", response_model=AdminSessionRead)
def admin_logout(request: Request) -> AdminSessionRead:
    request.session.clear()
    return AdminSessionRead(authenticated=False, username=None)


@router.get("/api/admin/overview", response_model=AdminOverviewResponse)
async def admin_overview(
    _: str = Depends(verify_admin_access),
    db: Session = Depends(get_db),
) -> AdminOverviewResponse:
    return await build_overview(db)


@router.get("/api/admin/logs")
def admin_logs(
    limit: int = Query(default=80, ge=1, le=300),
    level: str | None = Query(default=None),
    path: str | None = Query(default=None),
    status: int | None = Query(default=None, ge=0, le=599),
    _: str = Depends(verify_admin_access),
) -> dict[str, object]:
    return {
        "items": read_request_logs(limit, level=level, path=path, status=status),
        "log_file": str(REQUEST_LOG_PATH),
        "filters": {
            "limit": limit,
            "level": level,
            "path": path,
            "status": status,
        },
    }


@router.post("/api/admin/clients", response_model=DesktopClientRead)
async def create_client(
    payload: DesktopClientCreate,
    _: str = Depends(verify_admin_access),
    db: Session = Depends(get_db),
) -> DesktopClientRead:
    try:
        client = create_desktop_client(
            db,
            display_name=payload.display_name,
            note=payload.note,
            access_token=payload.access_token,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    return build_client_read(db, client)


@router.put("/api/admin/clients/{client_id}", response_model=DesktopClientRead)
async def update_client(
    client_id: str,
    payload: DesktopClientUpdate,
    _: str = Depends(verify_admin_access),
    db: Session = Depends(get_db),
) -> DesktopClientRead:
    client = db.scalar(select(DesktopClient).where(DesktopClient.client_id == client_id))
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found.")

    client.display_name = payload.display_name.strip()
    client.note = payload.note.strip() if payload.note else None
    client.enabled = payload.enabled
    db.add(client)
    db.commit()
    db.refresh(client)

    client_read = build_client_read(db, client)
    online_map = {connection.client_id: connection for connection in await notification_hub.list_connections()}
    client_read.is_online = client.client_id in online_map
    client_read.connected_at = online_map[client.client_id].connected_at if client.client_id in online_map else None
    return client_read


@router.post("/api/admin/clients/{client_id}/regenerate-token", response_model=DesktopClientTokenRead)
async def regenerate_client_token(
    client_id: str,
    _: str = Depends(verify_admin_access),
    db: Session = Depends(get_db),
) -> DesktopClientTokenRead:
    client = db.scalar(select(DesktopClient).where(DesktopClient.client_id == client_id))
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found.")

    client = regenerate_desktop_client_token(db, client)
    return DesktopClientTokenRead(client_id=client.client_id, access_token=client.access_token)


@router.delete("/api/admin/clients/{client_id}")
async def delete_client(
    client_id: str,
    _: str = Depends(verify_admin_access),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    client = db.scalar(select(DesktopClient).where(DesktopClient.client_id == client_id))
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found.")

    for binding in db.scalars(select(SmsRouteBinding).where(SmsRouteBinding.client_id == client_id)):
        db.delete(binding)
    for delivery in db.scalars(select(SmsDelivery).where(SmsDelivery.client_id == client_id)):
        db.delete(delivery)
    db.delete(client)
    db.commit()
    return {"status": "success"}


@router.post("/api/admin/bindings", response_model=SmsRouteBindingRead)
async def create_binding(
    payload: SmsRouteBindingCreate,
    _: str = Depends(verify_admin_access),
    db: Session = Depends(get_db),
) -> SmsRouteBindingRead:
    client = db.scalar(select(DesktopClient).where(DesktopClient.client_id == payload.client_id.strip()))
    if client is None:
        raise HTTPException(status_code=404, detail="Target client not found.")

    try:
        binding = upsert_route_binding(
            db,
            phone_number=payload.phone_number,
            client_id=payload.client_id,
            enabled=payload.enabled,
            note=payload.note,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    online_ids = {connection.client_id for connection in await notification_hub.list_connections()}
    return build_binding_read(binding, client, online_ids)


@router.put("/api/admin/bindings/{binding_id}", response_model=SmsRouteBindingRead)
async def update_binding(
    binding_id: int,
    payload: SmsRouteBindingUpdate,
    _: str = Depends(verify_admin_access),
    db: Session = Depends(get_db),
) -> SmsRouteBindingRead:
    binding = db.get(SmsRouteBinding, binding_id)
    if binding is None:
        raise HTTPException(status_code=404, detail="Binding not found.")

    client = db.scalar(select(DesktopClient).where(DesktopClient.client_id == payload.client_id.strip()))
    if client is None:
        raise HTTPException(status_code=404, detail="Target client not found.")

    normalized_receiver = normalize_phone(payload.phone_number)
    if not normalized_receiver:
        raise HTTPException(status_code=400, detail="Phone number is required.")

    duplicate = db.scalar(
        select(SmsRouteBinding).where(
            SmsRouteBinding.id != binding_id,
            SmsRouteBinding.normalized_receiver == normalized_receiver,
            SmsRouteBinding.client_id == payload.client_id.strip(),
        )
    )
    if duplicate is not None:
        raise HTTPException(status_code=409, detail="Binding already exists for this phone number and client.")

    binding.normalized_receiver = normalized_receiver
    binding.client_id = payload.client_id.strip()
    binding.enabled = payload.enabled
    binding.note = payload.note.strip() if payload.note else None
    db.add(binding)
    db.commit()
    db.refresh(binding)

    online_ids = {connection.client_id for connection in await notification_hub.list_connections()}
    return build_binding_read(binding, client, online_ids)


@router.delete("/api/admin/bindings/{binding_id}")
def delete_binding(
    binding_id: int,
    _: str = Depends(verify_admin_access),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    binding = db.get(SmsRouteBinding, binding_id)
    if binding is None:
        raise HTTPException(status_code=404, detail="Binding not found.")

    db.delete(binding)
    db.commit()
    return {"status": "success"}
