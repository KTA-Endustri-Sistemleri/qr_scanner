import frappe
from frappe import _

import frappe

@frappe.whitelist()
def get_csrf():
    return {"csrf_token": frappe.sessions.get_csrf_token()}


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