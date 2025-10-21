import hmac
import frappe
from frappe import _

@frappe.whitelist()
def verify_unlock_password(password):
    """Sadece parola doğrulama; sunucuda kilit tutmaz."""
    try:
        expected = (frappe.conf or {}).get("qr_scanner_unlock_password")
        if not expected:
            return {"ok": False, "reason": "not_configured"}
        ok = hmac.compare_digest(str(password), str(expected))
        return {"ok": bool(ok)}
    except Exception:
        frappe.log_error("verify_unlock_password failed", "qr_scanner")
        return {"ok": False, "msg": "verify_unlock_password failed"}

@frappe.whitelist()
def create_scan(qr_code, scanned_via="USB Scanner", device_id=None):
    """Duplicate kontrolü + insert. Sunucu tarafında kilit yok."""
    qr_code = (qr_code or "").strip()
    if not qr_code:
        frappe.throw(_("Empty QR code"))

    # Duplicate?
    if frappe.db.exists("QR Scan Record", {"qr_code": qr_code}):
        return {"ok": True, "created": False, "reason": "duplicate"}

    # Insert
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
        # istemciye teşhis için kısa mesaj ver
        return {"ok": False, "created": False, "reason": "error", "msg": str(e)}