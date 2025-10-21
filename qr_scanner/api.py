# apps/qr_scanner/qr_scanner/api.py
import hmac
import frappe
from frappe import _

# -------------------------
# Lock yardımcıları
# -------------------------

def _lock_key(user=None):
    user = user or frappe.session.user
    return "qr_scanner:lock:{0}".format(user)

@frappe.whitelist()
def set_lock(reason="error", ttl=0):
    key = _lock_key()
    cache = frappe.cache()
    cache.hset(key, "reason", reason or "error")
    cache.hset(key, "locked", 1)
    if ttl and int(ttl) > 0:
        cache.expire(key, int(ttl))
    return {"ok": True}

@frappe.whitelist()
def get_lock_state():
    key = _lock_key()
    cache = frappe.cache()
    locked = cache.hget(key, "locked")
    reason = cache.hget(key, "reason") or "error"
    is_locked = bool(int(locked)) if locked is not None else False
    return {"locked": is_locked, "reason": reason}

@frappe.whitelist()
def clear_lock():
    key = _lock_key()
    frappe.cache().delete(key)
    return {"ok": True}

# -------------------------
# Parola doğrulama
# -------------------------

@frappe.whitelist()
def verify_unlock_password(password):
    try:
        expected = (frappe.conf or {}).get("qr_scanner_unlock_password")
        if not expected:
            return {"ok": False, "reason": "not_configured"}
        ok = hmac.compare_digest(str(password), str(expected))
        if ok:
            clear_lock()   # başarıda kilidi kaldır
        return {"ok": bool(ok)}
    except Exception:
        frappe.log_error("verify_unlock_password failed", "qr_scanner")
        return {"ok": False}

# (Opsiyonel) CSRF
@frappe.whitelist()
def get_csrf():
    return {"csrf_token": frappe.sessions.get_csrf_token()}

# -------------------------
# Scan kaydı
# -------------------------

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
        frappe.log_error(frappe.get_traceback(), "QR Scanner: get_lock_state failed")
        return {"ok": False, "created": False, "reason": "error"}

    # 2) Duplicate kontrolü
    try:
        if frappe.db.exists("QR Scan Record", {"qr_code": qr_code}):
            try:
                set_lock(reason="duplicate")
            except Exception:
                frappe.log_error(frappe.get_traceback(), "QR Scanner: set_lock duplicate failed")
            return {"ok": True, "created": False, "reason": "duplicate"}
    except Exception:
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
        frappe.log_error(frappe.get_traceback(), "QR Scanner: create_scan failed")
        return {"ok": False, "created": False, "reason": "error"}
