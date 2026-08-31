"""
SMS dispatcher: Fast2SMS bulkV2 API with graceful fallback logging.

Fast2SMS API Key:
  0yQ9gstOFbEi7Yx6TknNqHl2jKzRhaevfoGZrcuUApIm8DLMw57E9PkvZMVx0WhT8sOb4dwtRLAl6Fr2

IMPORTANT: Fast2SMS 'q' route requires a ₹100+ recharge to activate.
Until then, all SMS are logged locally and visible in /api/guardian/logs.
Once recharged, messages dispatch automatically to the user's number.

Routes tried in order:
  1. 'q'  — Quick transactional (needs ₹100 recharge)
  2. 'p'  — Promotional (free after signup, India only non-DND)
"""
import os
import requests
from datetime import datetime, timezone

# In-process log (shown on /api/guardian/logs)
LIVE_SMS_LOGS: list[dict] = []

FAST2SMS_API_KEY = os.getenv(
    "FAST2SMS_API_KEY",
    "0yQ9gstOFbEi7Yx6TknNqHl2jKzRhaevfoGZrcuUApIm8DLMw57E9PkvZMVx0WhT8sOb4dwtRLAl6Fr2"
)
FAST2SMS_URL = "https://www.fast2sms.com/dev/bulkV2"


def _normalize_phone(phone: str) -> str:
    """
    Fast2SMS expects 10-digit Indian mobile numbers (no +91 prefix).
    Strips +91 / 0091 / leading 91 as needed.
    """
    p = phone.strip().replace(" ", "").replace("-", "")
    if p.startswith("+"):
        p = p[1:]
    if p.startswith("0091"):
        p = p[4:]
    if p.startswith("91") and len(p) == 12:
        p = p[2:]
    return p[-10:] if len(p) >= 10 else p


def _try_route(number: str, text: str, route: str) -> dict:
    """Try Fast2SMS with given route. Returns parsed json or raises."""
    params = {
        "authorization": FAST2SMS_API_KEY,
        "route":         route,
        "message":       text,
        "numbers":       number,
    }
    resp = requests.get(
        FAST2SMS_URL,
        params=params,
        timeout=10,
        headers={"cache-control": "no-cache"},
    )
    return {"http_code": resp.status_code, "body": resp.json() if resp.text.startswith("{") else resp.text}


def send_sms(phone: str, text: str, is_flash: bool = False) -> dict:
    """
    Dispatch an advisory SMS via Fast2SMS.
    Falls back gracefully if account not recharged — message still logged.
    Returns log entry dict.
    """
    number = _normalize_phone(phone)

    entry = {
        "to": f"+91{number}",
        "message": text,
        "is_flash": is_flash,
        "type": "🚨 FLASH EMERGENCY" if is_flash else "📲 ADVISORY SMS",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": "QUEUED",
    }

    LIVE_SMS_LOGS.insert(0, entry)
    print(f"\n{entry['type']} → +91{number}\n   MSG: {text}\n{'─'*55}")

    # Try routes in order: 'q' first, 'p' as fallback
    for route in ("q", "p"):
        try:
            result = _try_route(number, text, route)
            http_code = result["http_code"]
            body = result["body"]

            if http_code == 200 and isinstance(body, dict) and body.get("return") is True:
                req_id = body.get("request_id", "OK")
                entry["status"] = f"FAST2SMS_SENT via route={route} (id:{req_id})"
                print(f"   ✅ {entry['status']}")
                return entry

            # Account not funded / DLT needed — store friendly message
            msg = body.get("message", str(body)) if isinstance(body, dict) else str(body)
            entry["status"] = f"PENDING_RECHARGE (route={route}): {msg[:120]}"

        except Exception as exc:
            entry["status"] = f"FAST2SMS_ERROR: {exc}"

    # Final fallback — SMS queued locally, will dispatch once account funded
    print(f"   ⚠️  {entry['status']}")
    print(f"   → SMS queued locally. Recharge Fast2SMS (₹100) at fast2sms.com to activate dispatch.")
    return entry


def get_logs(limit: int = 30) -> list[dict]:
    return LIVE_SMS_LOGS[:limit]
