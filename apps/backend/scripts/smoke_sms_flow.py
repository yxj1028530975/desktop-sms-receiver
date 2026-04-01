from __future__ import annotations

import argparse
import asyncio
import json
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass

import websockets


@dataclass
class SmokeConfig:
    base_url: str
    inbound_api_key: str
    admin_token: str
    sender: str
    receiver: str
    device_id: str
    code: str


def make_isolated_receiver() -> str:
    suffix = int(time.time() * 1000) % 100000000
    return f"+86139{suffix:08d}"


def request_json(url: str, *, method: str = "GET", headers: dict[str, str] | None = None, body: dict | None = None) -> dict:
    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8") if body is not None else None,
        headers=headers or {},
        method=method,
    )
    with urllib.request.urlopen(request, timeout=5) as response:
        return json.loads(response.read().decode("utf-8"))


def build_ws_url(base_url: str, token: str) -> str:
    ws_base = base_url.rstrip("/").replace("http://", "ws://", 1).replace("https://", "wss://", 1)
    return f"{ws_base}/api/ws/desktop?{urllib.parse.urlencode({'token': token})}"


def create_client(config: SmokeConfig) -> dict:
    return request_json(
        f"{config.base_url}/api/admin/clients",
        method="POST",
        headers={
            "Content-Type": "application/json",
            "X-Admin-Token": config.admin_token,
        },
        body={
            "display_name": f"smoke-{int(time.time())}",
            "note": "smoke sms flow",
        },
    )


def create_binding(config: SmokeConfig, client_id: str) -> dict:
    return request_json(
        f"{config.base_url}/api/admin/bindings",
        method="POST",
        headers={
            "Content-Type": "application/json",
            "X-Admin-Token": config.admin_token,
        },
        body={
            "phone_number": config.receiver,
            "client_id": client_id,
            "enabled": True,
            "note": "smoke route",
        },
    )


def delete_client(config: SmokeConfig, client_id: str) -> None:
    try:
        request_json(
            f"{config.base_url}/api/admin/clients/{urllib.parse.quote(client_id)}",
            method="DELETE",
            headers={"X-Admin-Token": config.admin_token},
        )
    except Exception:
        pass


def wait_for_history_item(config: SmokeConfig, desktop_token: str, message_id: int, expected_code: str, timeout_seconds: float = 8.0) -> dict:
    started_at = time.time()
    latest_history: dict | None = None
    while time.time() - started_at < timeout_seconds:
        latest_history = request_json(
            f"{config.base_url}/api/messages?limit=10",
            headers={"X-Desktop-Token": desktop_token},
        )
        for item in latest_history.get("items", []):
            if item.get("id") == message_id:
                if item.get("code") != expected_code:
                    raise RuntimeError(f"Unexpected code in history: {item.get('code')}")
                return item
        time.sleep(0.15)

    raise RuntimeError(f"History did not contain message {message_id}: {latest_history}")


async def run_smoke(config: SmokeConfig) -> dict:
    client = create_client(config)
    desktop_token = client["access_token"]
    try:
        create_binding(config, client["client_id"])

        async with websockets.connect(build_ws_url(config.base_url, desktop_token)) as websocket:
            ready = json.loads(await asyncio.wait_for(websocket.recv(), timeout=5))
            if ready.get("type") != "system.ready":
                raise RuntimeError(f"Expected system.ready, got {ready}")

            inbound = request_json(
                f"{config.base_url}/api/sms/inbound",
                method="POST",
                headers={
                    "Content-Type": "application/json",
                    "X-API-Key": config.inbound_api_key,
                },
                body={
                    "sender": config.sender,
                    "content": f"\u3010Smoke \u6d4b\u8bd5\u3011\u60a8\u7684\u9a8c\u8bc1\u7801\u662f {config.code}\uff0c10 \u5206\u949f\u5185\u6709\u6548\u3002",
                    "dev": config.device_id,
                    "receiver": config.receiver,
                },
            )
            if inbound.get("status") != "success":
                raise RuntimeError(f"Inbound failed: {inbound}")

            pushed = json.loads(await asyncio.wait_for(websocket.recv(), timeout=5))
            if pushed.get("type") != "sms.created":
                raise RuntimeError(f"Expected sms.created, got {pushed}")

            top_item = wait_for_history_item(
                config,
                desktop_token,
                pushed["data"]["id"],
                config.code,
            )

            ack = request_json(
                f"{config.base_url}/api/messages/{top_item['id']}/ack",
                method="POST",
                headers={"X-Desktop-Token": desktop_token},
                body={},
            )
            if ack.get("status") != "success":
                raise RuntimeError(f"Ack failed: {ack}")

        return {
            "client_id": client["client_id"],
            "receiver": config.receiver,
            "ready_type": ready["type"],
            "message_id": inbound["message_id"],
            "pushed_type": pushed["type"],
            "history_top_id": top_item["id"],
            "history_top_code": top_item["code"],
            "ack_status": ack["status"],
        }
    finally:
        delete_client(config, client["client_id"])


def parse_args() -> SmokeConfig:
    parser = argparse.ArgumentParser(description="Smoke test the local SMS routing flow.")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--inbound-api-key", default="change-this-inbound-key")
    parser.add_argument("--admin-token", default="admin123")
    parser.add_argument("--sender", default="106926662034679")
    parser.add_argument("--receiver", default=make_isolated_receiver())
    parser.add_argument("--device-id", default="smoke-script")
    parser.add_argument("--code", default=f"{int(time.time()) % 1000000:06d}")
    args = parser.parse_args()
    return SmokeConfig(
        base_url=args.base_url,
        inbound_api_key=args.inbound_api_key,
        admin_token=args.admin_token,
        sender=args.sender,
        receiver=args.receiver,
        device_id=args.device_id,
        code=args.code,
    )


if __name__ == "__main__":
    print(json.dumps(asyncio.run(run_smoke(parse_args())), ensure_ascii=False, indent=2))
