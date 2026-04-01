from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


MessageCategory = Literal["code", "notice", "other"]


class InboundSmsPayload(BaseModel):
    sender: str = Field(..., min_length=1, max_length=64)
    content: str = Field(..., min_length=1)
    dev: str | None = Field(default=None, max_length=64)
    receiver: str = Field(..., min_length=1, max_length=32)
    contact_name: str | None = Field(default=None, max_length=128)


class SmsMessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sender: str
    receiver: str
    normalized_receiver: str
    content: str
    category: MessageCategory
    code: str | None = None
    device_id: str | None = None
    contact_name: str | None = None
    pushed_at: datetime | None = None
    acknowledged_at: datetime | None = None
    created_at: datetime


class SmsMessageList(BaseModel):
    items: list[SmsMessageRead]
    next_cursor_id: int | None = None


class InboundSmsResponse(BaseModel):
    status: str
    message_id: int
    category: MessageCategory
    code: str | None = None
    pushed_clients: int = 0


class AckResponse(BaseModel):
    status: str
    message_id: int
    acknowledged_at: datetime


class RealtimeEnvelope(BaseModel):
    type: str
    data: dict[str, Any]


class DesktopClientRead(BaseModel):
    client_id: str
    access_token: str
    display_name: str | None = None
    note: str | None = None
    enabled: bool = True
    is_online: bool
    connected_at: datetime | None = None
    last_seen_at: datetime | None = None
    binding_count: int = 0
    phone_numbers: list[str] = []


class AdminLoginPayload(BaseModel):
    username: str = Field(..., min_length=1, max_length=64)
    password: str = Field(..., min_length=1, max_length=128)


class AdminSessionRead(BaseModel):
    authenticated: bool
    username: str | None = None


class DesktopClientCreate(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=128)
    note: str | None = Field(default=None, max_length=255)
    access_token: str | None = Field(default=None, max_length=128)


class DesktopClientUpdate(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=128)
    note: str | None = Field(default=None, max_length=255)
    enabled: bool = True


class DesktopClientTokenRead(BaseModel):
    client_id: str
    access_token: str


class SmsRouteBindingCreate(BaseModel):
    phone_number: str = Field(..., min_length=1, max_length=32)
    client_id: str = Field(..., min_length=1, max_length=64)
    enabled: bool = True
    note: str | None = Field(default=None, max_length=255)


class SmsRouteBindingUpdate(BaseModel):
    phone_number: str = Field(..., min_length=1, max_length=32)
    client_id: str = Field(..., min_length=1, max_length=64)
    enabled: bool = True
    note: str | None = Field(default=None, max_length=255)


class SmsRouteBindingRead(BaseModel):
    id: int
    phone_number: str
    normalized_receiver: str
    client_id: str
    client_display_name: str | None = None
    client_online: bool
    enabled: bool
    note: str | None = None
    created_at: datetime
    updated_at: datetime


class AdminOverviewResponse(BaseModel):
    clients: list[DesktopClientRead]
    bindings: list[SmsRouteBindingRead]
