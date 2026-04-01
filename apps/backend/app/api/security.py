from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import DesktopClient


settings = get_settings()


def _extract_bearer_token(authorization: str | None) -> str | None:
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    return None


def _extract_desktop_token(authorization: str | None, x_desktop_token: str | None) -> str | None:
    return (x_desktop_token or _extract_bearer_token(authorization) or "").strip() or None


def verify_inbound_api_key(
    x_api_key: Annotated[str | None, Header(alias="X-API-Key")] = None,
) -> None:
    if x_api_key != settings.inbound_api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid inbound API key.")


def get_desktop_client(
    db: Session = Depends(get_db),
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    x_desktop_token: Annotated[str | None, Header(alias="X-Desktop-Token")] = None,
) -> DesktopClient:
    token = _extract_desktop_token(authorization, x_desktop_token)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing desktop token.")

    client = db.scalar(select(DesktopClient).where(DesktopClient.access_token == token))
    if client is None or not client.enabled:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid desktop token.")
    return client


def verify_desktop_token(client: DesktopClient = Depends(get_desktop_client)) -> DesktopClient:
    return client


def verify_admin_access(
    request: Request,
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    x_admin_token: Annotated[str | None, Header(alias="X-Admin-Token")] = None,
) -> str:
    if request.session.get("admin_authenticated") is True:
        return request.session.get("admin_username") or settings.admin_username

    token = (x_admin_token or _extract_bearer_token(authorization) or "").strip()
    if token and token == settings.admin_password:
        return settings.admin_username

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin login required.")
