import asyncio
from dataclasses import dataclass
from datetime import datetime, timezone

from fastapi import WebSocket


@dataclass(slots=True)
class ClientConnection:
    client_id: str
    websocket: WebSocket
    connected_at: datetime


class NotificationHub:
    def __init__(self) -> None:
        self._connections: dict[str, ClientConnection] = {}
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, client_id: str) -> None:
        await websocket.accept()
        replaced: ClientConnection | None = None

        async with self._lock:
            replaced = self._connections.get(client_id)
            self._connections[client_id] = ClientConnection(
                client_id=client_id,
                websocket=websocket,
                connected_at=datetime.now(timezone.utc),
            )

        if replaced is not None:
            try:
                await replaced.websocket.send_json({
                    "type": "system.replaced",
                    "data": {"client_id": client_id},
                })
            finally:
                await replaced.websocket.close(code=4009, reason="session-replaced")

    async def disconnect(self, client_id: str) -> None:
        async with self._lock:
            self._connections.pop(client_id, None)

    async def send_personal(self, client_id: str, payload: dict) -> bool:
        async with self._lock:
            connection = self._connections.get(client_id)

        if connection is None:
            return False

        try:
            await connection.websocket.send_json(payload)
            return True
        except Exception:
            await self.disconnect(client_id)
            return False

    async def broadcast(self, event_type: str, data: dict) -> int:
        async with self._lock:
            connections = list(self._connections.values())

        delivered = 0
        stale_client_ids: list[str] = []

        for connection in connections:
            try:
                await connection.websocket.send_json({"type": event_type, "data": data})
                delivered += 1
            except Exception:
                stale_client_ids.append(connection.client_id)

        for client_id in stale_client_ids:
            await self.disconnect(client_id)

        return delivered

    async def broadcast_to(self, event_type: str, data: dict, client_ids: list[str]) -> list[str]:
        targets = {client_id for client_id in client_ids if client_id}
        if not targets:
            return []

        async with self._lock:
            connections = [connection for connection in self._connections.values() if connection.client_id in targets]

        delivered_client_ids: list[str] = []
        stale_client_ids: list[str] = []

        for connection in connections:
            try:
                await connection.websocket.send_json({"type": event_type, "data": data})
                delivered_client_ids.append(connection.client_id)
            except Exception:
                stale_client_ids.append(connection.client_id)

        for client_id in stale_client_ids:
            await self.disconnect(client_id)

        return delivered_client_ids

    async def online_count(self) -> int:
        async with self._lock:
            return len(self._connections)

    async def list_connections(self) -> list[ClientConnection]:
        async with self._lock:
            return list(self._connections.values())


notification_hub = NotificationHub()
