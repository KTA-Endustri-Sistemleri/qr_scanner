@frappe.whitelist()
def create_scan(qr_code, scanned_via="USB Scanner", device_id=None):
    qr_code = (qr_code or "").strip()
    if not qr_code:
        frappe.throw(_("Empty QR code"))

    # 1) Kilit kontrolü
    try:
        state = get_lock_state()
        if state.get("locked"):
            return {"ok": False, "created": False, "reason": "locked"}
    except Exception:
        # Önceden: burada 'locked' diyorduk → yanlış pozitif olabiliyor
        frappe.log_error(frappe.get_traceback(), "QR Scanner: get_lock_state failed")
        return {"ok": False, "created": False, "reason": "error"}  # <-- lock yok

    # 2) Duplicate kontrolü
    try:
        if frappe.db.exists("QR Scan Record", {"qr_code": qr_code}):
            try:
                set_lock(reason="duplicate")  # <-- sadece duplicate'ta kilitle
            except Exception:
                frappe.log_error(frappe.get_traceback(), "QR Scanner: set_lock duplicate failed")
            return {"ok": True, "created": False, "reason": "duplicate"}
    except Exception:
        # DB hatası → lock YOK, sadece error dön
        frappe.log_error(frappe.get_traceback(), "QR Scanner: duplicate check failed")
        return {"ok": False, "created": False, "reason": "error"}

    # 3) Insert
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
    except Exception:
        # Insert hatası → lock YOK, sadece error
        frappe.log_error(frappe.get_traceback(), "QR Scanner: create_scan failed")
        return {"ok": False, "created": False, "reason": "error"}