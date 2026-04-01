import re
from dataclasses import dataclass


PHONE_SANITIZER_RE = re.compile(r"[^\d+]")
CODE_HINT_RE = re.compile(
    r"(验证码|校验码|动态码|短信码|OTP|otp|verification code|security code|login code|code)",
    re.IGNORECASE,
)
CODE_RE = re.compile(r"(?<!\d)(\d{4,8})(?!\d)")
NOTICE_HINTS = (
    "【",
    "通知",
    "提醒",
    "订单",
    "物流",
    "签收",
    "服务",
    "派送",
    "账单",
)


@dataclass(slots=True)
class ParsedSms:
    normalized_receiver: str
    category: str
    code: str | None


def normalize_phone(phone_number: str | None) -> str:
    if not phone_number:
        return ""

    cleaned = PHONE_SANITIZER_RE.sub("", phone_number.strip())
    if cleaned.startswith("+86"):
        return cleaned[3:]
    if cleaned.startswith("86") and len(cleaned) > 11:
        return cleaned[2:]
    return cleaned


def parse_sms_content(content: str, receiver: str | None) -> ParsedSms:
    body = (content or "").strip()
    normalized_receiver = normalize_phone(receiver)

    code_match = CODE_RE.search(body)
    code = code_match.group(1) if code_match else None

    if code and CODE_HINT_RE.search(body):
        return ParsedSms(normalized_receiver=normalized_receiver, category="code", code=code)

    if any(hint in body for hint in NOTICE_HINTS):
        return ParsedSms(normalized_receiver=normalized_receiver, category="notice", code=None)

    if code and len(body) <= 120:
        return ParsedSms(normalized_receiver=normalized_receiver, category="code", code=code)

    return ParsedSms(normalized_receiver=normalized_receiver, category="other", code=None)
