from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.security import get_desktop_client, verify_desktop_token, verify_inbound_api_key
from app.config import get_settings
from app.database import get_db
from app.models import DesktopClient, SmsDelivery, SmsMessage
from app.schemas import AckResponse, InboundSmsPayload, InboundSmsResponse, SmsMessageList, SmsMessageRead
from app.services.notification_hub import notification_hub
from app.services.parser import parse_sms_content
from app.services.routing import (
    build_message_read,
    create_delivery_rows,
    list_target_client_ids,
    mark_deliveries_as_delivered,
)


router = APIRouter(prefix="/api", tags=["messages"])
settings = get_settings()


@router.post("/sms/inbound", response_model=InboundSmsResponse, dependencies=[Depends(verify_inbound_api_key)])
async def create_inbound_sms(payload: InboundSmsPayload, db: Session = Depends(get_db)) -> InboundSmsResponse:
    parsed = parse_sms_content(payload.content, payload.receiver)

    message = SmsMessage(
        sender=payload.sender.strip(),
        receiver=payload.receiver.strip(),
        normalized_receiver=parsed.normalized_receiver,
        content=payload.content.strip(),
        category=parsed.category,
        code=parsed.code,
        device_id=payload.dev,
        contact_name=payload.contact_name,
        raw_payload=payload.model_dump(mode="json"),
    )
    db.add(message)
    db.commit()
    db.refresh(message)

    target_client_ids = list_target_client_ids(db, parsed.normalized_receiver or payload.receiver)
    create_delivery_rows(db, message.id, target_client_ids)

    message_read = SmsMessageRead.model_validate(message)
    delivered_client_ids = await notification_hub.broadcast_to(
        event_type="sms.created",
        data=message_read.model_dump(mode="json"),
        client_ids=target_client_ids,
    )

    if delivered_client_ids:
        mark_deliveries_as_delivered(db, message.id, delivered_client_ids)
        message.pushed_at = datetime.now(timezone.utc)
        db.add(message)
        db.commit()

    return InboundSmsResponse(
        status="success",
        message_id=message.id,
        category=message.category,
        code=message.code,
        pushed_clients=len(delivered_client_ids),
    )


@router.get("/messages", response_model=SmsMessageList, dependencies=[Depends(verify_desktop_token)])
def list_messages(
    db: Session = Depends(get_db),
    client: DesktopClient = Depends(get_desktop_client),
    limit: int = Query(default=50, ge=1, le=200),
    cursor_id: int | None = Query(default=None, ge=1),
) -> SmsMessageList:
    safe_limit = min(limit, settings.max_history_items)

    stmt = (
        select(SmsDelivery, SmsMessage)
        .join(SmsMessage, SmsDelivery.message_id == SmsMessage.id)
        .where(SmsDelivery.client_id == client.client_id)
        .order_by(SmsMessage.id.desc())
        .limit(safe_limit + 1)
    )
    if cursor_id is not None:
        stmt = stmt.where(SmsMessage.id < cursor_id)

    rows = list(db.execute(stmt).all())
    next_cursor_id = rows[-1][1].id if len(rows) > safe_limit else None
    items = rows[:safe_limit]

    return SmsMessageList(
        items=[build_message_read(message, delivery) for delivery, message in items],
        next_cursor_id=next_cursor_id,
    )


@router.post("/messages/{message_id}/ack", response_model=AckResponse, dependencies=[Depends(verify_desktop_token)])
def acknowledge_message(
    message_id: int,
    db: Session = Depends(get_db),
    client: DesktopClient = Depends(get_desktop_client),
) -> AckResponse:
    delivery = db.scalar(
        select(SmsDelivery).where(
            SmsDelivery.message_id == message_id,
            SmsDelivery.client_id == client.client_id,
        )
    )
    if delivery is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found for this client.")

    now = datetime.now(timezone.utc)
    delivery.acknowledged_at = now
    db.add(delivery)

    message = db.get(SmsMessage, message_id)
    if message is not None and message.acknowledged_at is None:
        message.acknowledged_at = now
        db.add(message)

    db.commit()

    return AckResponse(
        status="success",
        message_id=message_id,
        acknowledged_at=now,
    )
