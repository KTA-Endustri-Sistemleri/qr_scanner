import hmac
import json
import frappe
from frappe import _
from frappe.utils.password import get_decrypted_password

@frappe.whitelist()
def get_client_settings():
    """İstemciye güvenli ayarları döner (parola **yok**)."""
    try:
        from qr_scanner.qr_scanner.doctype.qr_scan_settings.qr_scan_settings import get_cached_settings
        return get_cached_settings()
    except Exception:
        return {
            "success_toast_ms": 1500,
            "beep_enabled": 1,
            "vibrate_enabled": 1,
            "debounce_ms": 800,
            "autofocus_back": 1,
            "silence_ms": 120,
            "lock_on_duplicate": 1
        }

def _get_settings_password():
    """Parolayı 'QR Scan Settings' Password alanından getir; yoksa site_config fallback."""
    try:
        pwd = get_decrypted_password("QR Scan Settings", "QR Scan Settings", "unlock_password", raise_exception=False)
        if pwd:
            return str(pwd)
    except Exception:
        pass
    try:
        return str((frappe.conf or {}).get("qr_scanner_unlock_password") or "")
    except Exception:
        return ""

@frappe.whitelist()
def verify_unlock_password(password):
    """Kilit parolasını doğrular (DocType + site_config fallback)."""
    try:
        expected = _get_settings_password()
        if not expected:
            return {"ok": False, "reason": "not_configured"}
        ok = hmac.compare_digest(str(password or ""), expected)
        return {"ok": bool(ok)}
    except Exception:
        frappe.log_error("verify_unlock_password failed", "qr_scanner")
        return {"ok": False}

@frappe.whitelist()
def create_scan(qr_code, scanned_via="USB Scanner", device_id=None):
    qr_code = (qr_code or "").strip()
    if not qr_code:
        frappe.throw(_("Empty QR code"))

    if frappe.db.exists("QR Scan Record", {"qr_code": qr_code}):
        return {"ok": True, "created": False, "reason": "duplicate"}

    try:
        doc = frappe.get_doc({
            "doctype": "QR Scan Record",
            "qr_code": qr_code,
            "scanned_via": scanned_via,
            "device_id": device_id,
            "scanned_by": frappe.session.user,
            "status": "Validated",
        })
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return {"ok": True, "created": True, "name": doc.name}
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "QR Scanner: create_scan failed")
        # >>> buradaki msg istemcide gösterilecek
        return {"ok": False, "created": False, "reason": "error", "msg": str(e)}