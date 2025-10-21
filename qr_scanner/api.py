import hmac
import frappe
from frappe import _

import frappe

@frappe.whitelist()
def get_csrf():
    return {"csrf_token": frappe.sessions.get_csrf_token()}

@frappe.whitelist()
def verify_unlock_password(password: str):
    """
    Tam ekran kilidi kaldırmak için parola doğrulaması.
    Parola, site_config.json içinde "qr_scanner_unlock_password" anahtarıyla tutulur.
    Örn: bench set-config -g qr_scanner_unlock_password "changeit"
    """
    try:
        expected = (frappe.conf or {}).get("qr_scanner_unlock_password")
        if not expected:
            return {"ok": False, "reason": "not_configured"}
        ok = hmac.compare_digest(str(password), str(expected))
        return {"ok": bool(ok)}
    except Exception:
        frappe.log_error("verify_unlock_password failed", "qr_scanner")
        return {"ok": False}

@frappe.whitelist()
def create_scan(qr_code: str, scanned_via: str = "USB Scanner", device_id: str | None = None):
    qr_code = (qr_code or "").strip()
    if not qr_code:
        frappe.throw(_("Empty QR code"))

    if frappe.db.exists("QR Scan Record", {"qr_code": qr_code}):
        return {"ok": True, "created": False, "reason": "duplicate"}

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