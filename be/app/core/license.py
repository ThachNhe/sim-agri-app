"""
LICENSE GUARD
─────────────
Xác thực LICENSE_KEY (OpenAI API key) với OpenAI mỗi CHECK_INTERVAL_SECONDS giây.
Nếu key bị xóa/thu hồi trên dashboard OpenAI → app từ chối toàn bộ request.

Để tắt tính năng này: comment 4 dòng có ký hiệu  # ── LICENSE CHECK  trong main.py.
"""

import asyncio
import httpx

from app.core.logger import logger

# ── Cấu hình ──────────────────────────────────────────────────────────────────
_VERIFY_URL = "https://api.openai.com/v1/models"
CHECK_INTERVAL_SECONDS = 30          # Re-validate mỗi 30 giây

# ── Trạng thái runtime (module-level, an toàn với asyncio single-thread) ───────
_license_valid: bool = False


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _call_openai(api_key: str) -> bool:
    """Trả về True nếu OpenAI chấp nhận key."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                _VERIFY_URL,
                headers={"Authorization": f"Bearer {api_key}"},
            )
        return resp.status_code == 200
    except Exception as exc:
        logger.warning(f"[LICENSE] Lỗi kết nối khi kiểm tra key: {exc}")
        return False


# ── Public API ────────────────────────────────────────────────────────────────

async def verify_license_on_startup(api_key: str) -> None:
    """Kiểm tra key 1 lần lúc khởi động. Gọi SystemExit(1) nếu key không hợp lệ."""
    global _license_valid
    logger.info("[LICENSE] Đang xác thực license key...")
    if not await _call_openai(api_key):
        logger.error("[LICENSE] ❌ License key không hợp lệ hoặc đã bị thu hồi.")
        raise SystemExit(1)
    _license_valid = True
    logger.info("[LICENSE] ✅ License key hợp lệ. Ứng dụng khởi động bình thường.")


async def license_watcher(api_key: str) -> None:
    """
    Background task: re-validate key mỗi CHECK_INTERVAL_SECONDS.
    Khi key bị xóa trên OpenAI dashboard → _license_valid = False
    → LicenseGateMiddleware sẽ trả 503 cho mọi request.
    """
    global _license_valid
    while True:
        await asyncio.sleep(CHECK_INTERVAL_SECONDS)
        valid = await _call_openai(api_key)
        if not valid and _license_valid:
            _license_valid = False
            logger.error(
                "[LICENSE] ❌ License key đã bị thu hồi. "
                "Mọi request sẽ bị từ chối cho đến khi key hợp lệ trở lại."
            )
        elif valid and not _license_valid:
            _license_valid = True
            logger.info("[LICENSE] ✅ License key hợp lệ trở lại.")


def is_license_valid() -> bool:
    """Dùng bởi LicenseGateMiddleware để kiểm tra trạng thái hiện tại."""
    return _license_valid
