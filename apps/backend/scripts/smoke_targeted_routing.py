from __future__ import annotations

import asyncio
import json
import time
import urllib.parse
import urllib.request

import websockets


BASE_URL = "http://127.0.0.1:8000"
ADMIN_TOKEN = "admin123"
INBOUND_API_KEY = "change-this-inbound-key"


def make_isolated_receiver() -> str:
    suffix = int(time.time() * 1000) % 100000000
    return f"+86138{suffix:08d}"


RECEIVER = make_isolated_receiver()


def request_json(url: str, *, method: str = "GET", headers: dict[str, str] | None = None, body: dict | None = None) -> dict:
    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8") if body is not None else None,
        headers=headers or {},
        method=method,
    )
    with urllib.request.urlopen(request, timeout=5) as response:
        return json.loads(response.read().decode("utf-8"))


def create_client(prefix: str) -> dict:
    return request_json(
        f"{BASE_URL}/api/admin/clients",
        method="POST",
        headers={
            "Content-Type": "application/json",
            "X-Admin-Token": ADMIN_TOKEN,
        },
        body={
            "display_name": f"{prefix}-{int(time.time())}",
            "note": "targeted smoke",
        },
    )


def create_binding(phone_number: str, client_id: str) -> dict:
    return request_json(
        f"{BASE_URL}/api/admin/bindings",
        method="POST",
        headers={
            "Content-Type": "application/json",
            "X-Admin-Token": ADMIN_TOKEN,
        },
        body={
            "phone_number": phone_number,
            "client_id": client_id,
            "enabled": True,
            "note": "targeted smoke",
        },
    )


def delete_client(client_id: str) -> None:
    try:
        request_json(
            f"{BASE_URL}/api/admin/clients/{urllib.parse.quote(client_id)}",
            method="DELETE",
            headers={"X-Admin-Token": ADMIN_TOKEN},
        )
    except Exception:
        pass


def build_ws_url(token: str) -> str:
    ws_base = BASE_URL.rstrip("/").replace("http://", "ws://", 1)
    return f"{ws_base}/api/ws/desktop?{urllib.parse.urlencode({'token': token})}"


async def run() -> dict:
    target_client = create_client("target")
    other_client = create_client("other")
    try:
        create_binding(RECEIVER, target_client["client_id"])

        async with websockets.connect(build_ws_url(target_client["access_token"])) as target_ws, websockets.connect(
            build_ws_url(other_client["access_token"])
        ) as other_ws:
            target_ready = json.loads(await asyncio.wait_for(target_ws.recv(), timeout=5))
            other_ready = json.loads(await asyncio.wait_for(other_ws.recv(), timeout=5))
            if target_ready.get("type") != "system.ready" or other_ready.get("type") != "system.ready":
                raise RuntimeError("WebSocket handshake failed.")

            code = f"{int(time.time()) % 1000000:06d}"
            inbound = request_json(
                f"{BASE_URL}/api/sms/inbound",
                method="POST",
                headers={
                    "Content-Type": "application/json",
                    "X-API-Key": INBOUND_API_KEY,
                },
                body={
                    "sender": "106900002468",
                    "content": f"\u3010\u5b9a\u5411\u6d4b\u8bd5\u3011\u60a8\u7684\u9a8c\u8bc1\u7801\u662f {code}\uff0c10 \u5206\u949f\u5185\u6709\u6548\u3002",
                    "dev": "targeted-smoke",
                    "receiver": RECEIVER,
                },
            )
            if inbound.get("status") != "success":
                raise RuntimeError(f"Inbound failed: {inbound}")

            target_message = json.loads(await asyncio.wait_for(target_ws.recv(), timeout=5))
            if target_message.get("type") != "sms.created":
                raise RuntimeError(f"Target client did not receive sms.created: {target_message}")

            leaked = False
            leaked_message = None
            try:
                leaked_message = await asyncio.wait_for(other_ws.recv(), timeout=1.2)
                leaked = True
            except asyncio.TimeoutError:
                pass

            target_history = request_json(
                f"{BASE_URL}/api/messages?limit=10",
                headers={"X-Desktop-Token": target_client["access_token"]},
            )
            other_history = request_json(
                f"{BASE_URL}/api/messages?limit=10",
                headers={"X-Desktop-Token": other_client["access_token"]},
            )

            top_target = next((item for item in target_history["items"] if item["id"] == target_message["data"]["id"]), None)
            if not top_target or top_target["code"] != code:
                raise RuntimeError(f"Target history mismatch: {target_history}")
            if any(item["id"] == top_target["id"] for item in other_history["items"]):
                raise RuntimeError(f"Other client history leaked target message: {other_history}")

        return {
            "target_client": target_client["client_id"],
            "other_client": other_client["client_id"],
            "receiver": RECEIVER,
            "message_id": inbound["message_id"],
            "target_received": target_message["type"],
            "other_received_anything": leaked,
            "other_payload": leaked_message,
            "target_history_top_id": top_target["id"],
            "target_history_top_code": top_target["code"],
        }
    finally:
        delete_client(target_client["client_id"])
        delete_client(other_client["client_id"])


if __name__ == "__main__":
    print(json.dumps(asyncio.run(run()), ensure_ascii=False, indent=2))
