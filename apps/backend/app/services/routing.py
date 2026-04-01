from collections import Counter
from datetime import datetime, timezone
import secrets
import string

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import DesktopClient, SmsDelivery, SmsRouteBinding
from app.schemas import SmsMessageRead
from app.services.parser import normalize_phone


TOKEN_ALPHABET = string.ascii_letters + string.digits


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def generate_client_id() -> str:
    return f"desktop-{secrets.token_hex(4)}"


def generate_client_token(length: int = 32) -> str:
    return "".join(secrets.choice(TOKEN_ALPHABET) for _ in range(length))


def create_desktop_client(
    db: Session,
    *,
    display_name: str,
    note: str | None = None,
    access_token: str | None = None,
) -> DesktopClient:
    token = (access_token or generate_client_token()).strip()
    if not token:
        raise ValueError("Client token is required.")

    if db.scalar(select(DesktopClient).where(DesktopClient.access_token == token)):
        raise ValueError("Client token already exists.")

    client = DesktopClient(
        client_id=generate_client_id(),
        access_token=token,
        display_name=display_name.strip(),
        note=note.strip() if note else None,
        enabled=True,
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


def touch_desktop_client(db: Session, client: DesktopClient) -> DesktopClient:
    client.last_seen_at = utcnow()
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


def regenerate_desktop_client_token(db: Session, client: DesktopClient) -> DesktopClient:
    while True:
        token = generate_client_token()
        if db.scalar(select(DesktopClient).where(DesktopClient.access_token == token)) is None:
            client.access_token = token
            db.add(client)
            db.commit()
            db.refresh(client)
            return client


def list_target_client_ids(db: Session, phone_number: str) -> list[str]:
    normalized_receiver = normalize_phone(phone_number)
    if not normalized_receiver:
        return []

    stmt = (
        select(SmsRouteBinding.client_id)
        .join(DesktopClient, DesktopClient.client_id == SmsRouteBinding.client_id)
        .where(
            SmsRouteBinding.normalized_receiver == normalized_receiver,
            SmsRouteBinding.enabled.is_(True),
            DesktopClient.enabled.is_(True),
        )
        .order_by(SmsRouteBinding.client_id.asc())
    )
    return list(dict.fromkeys(db.scalars(stmt)))


def upsert_route_binding(
    db: Session,
    *,
    phone_number: str,
    client_id: str,
    enabled: bool,
    note: str | None,
) -> SmsRouteBinding:
    normalized_receiver = normalize_phone(phone_number)
    if not normalized_receiver:
        raise ValueError("Phone number is required.")
    binding = db.scalar(
        select(SmsRouteBinding).where(
            SmsRouteBinding.normalized_receiver == normalized_receiver,
            SmsRouteBinding.client_id == client_id.strip(),
        )
    )
    if binding is None:
        binding = SmsRouteBinding(
            normalized_receiver=normalized_receiver,
            client_id=client_id.strip(),
            enabled=enabled,
            note=note.strip() if note else None,
        )
    else:
        binding.enabled = enabled
        binding.note = note.strip() if note else None

    db.add(binding)
    db.commit()
    db.refresh(binding)
    return binding


def create_delivery_rows(db: Session, message_id: int, client_ids: list[str]) -> list[SmsDelivery]:
    deliveries: list[SmsDelivery] = []
    unique_client_ids = list(dict.fromkeys(client_ids))
    for client_id in unique_client_ids:
        delivery = SmsDelivery(message_id=message_id, client_id=client_id)
        db.add(delivery)
        deliveries.append(delivery)

    if deliveries:
        db.commit()
        for delivery in deliveries:
            db.refresh(delivery)

    return deliveries


def mark_deliveries_as_delivered(db: Session, message_id: int, delivered_client_ids: list[str]) -> None:
    if not delivered_client_ids:
        return

    stmt = select(SmsDelivery).where(
        SmsDelivery.message_id == message_id,
        SmsDelivery.client_id.in_(delivered_client_ids),
    )
    now = utcnow()
    for delivery in db.scalars(stmt):
        delivery.delivered_at = now
        db.add(delivery)
    db.commit()


def route_binding_counts(db: Session) -> Counter[str]:
    counts: Counter[str] = Counter()
    for client_id in db.scalars(select(SmsRouteBinding.client_id)):
        counts[client_id] += 1
    return counts


def build_message_read(message, delivery: SmsDelivery) -> SmsMessageRead:
    return SmsMessageRead(
        id=message.id,
        sender=message.sender,
        receiver=message.receiver,
        normalized_receiver=message.normalized_receiver,
        content=message.content,
        category=message.category,
        code=message.code,
        device_id=message.device_id,
        contact_name=message.contact_name,
        pushed_at=delivery.delivered_at or message.pushed_at,
        acknowledged_at=delivery.acknowledged_at,
        created_at=message.created_at,
    )
