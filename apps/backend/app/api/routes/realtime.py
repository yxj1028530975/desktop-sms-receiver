from datetime import datetime, timezone

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select

from app.config import get_settings
from app.database import SessionLocal
from app.models import DesktopClient
from app.services.notification_hub import notification_hub
from app.services.routing import touch_desktop_client


router = APIRouter(tags=["realtime"])
settings = get_settings()


@router.websocket("/api/ws/desktop")
async def desktop_socket(
    websocket: WebSocket,
    token: str = Query(...),
) -> None:
    with SessionLocal() as db:
        client = db.scalar(select(DesktopClient).where(DesktopClient.access_token == token))
        if client is None or not client.enabled:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        client = touch_desktop_client(db, client)
        client_id = client.client_id
        display_name = client.display_name or client.client_id

    await notification_hub.connect(websocket, client_id)
    await notification_hub.send_personal(
        client_id,
        {
            "type": "system.ready",
            "data": {
                "client_id": client_id,
                "display_name": display_name,
                "server_time": datetime.now(timezone.utc).isoformat(),
            },
        },
    )

    try:
        while True:
            message = await websocket.receive_text()
            if message.strip().lower() == "ping":
                await websocket.send_json({"type": "pong", "data": {"client_id": client_id}})
    except WebSocketDisconnect:
        await notification_hub.disconnect(client_id)
    except Exception:
        await notification_hub.disconnect(client_id)
        await websocket.close(code=1011)
