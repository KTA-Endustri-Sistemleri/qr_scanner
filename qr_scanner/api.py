import hmac
import frappe
from frappe import _

import frappe

def _lock_key(user=None):
    user = user or frappe.session.user
    return f"qr_scanner:lock:{user}"

@frappe.whitelist()
def set_lock(reason="error", ttl=0):
    """Kullanıcıyı kilitle. ttl>0 verilirse saniye bazlı otomatik düşer (opsiyonel)."""
    key = _lock_key()
    frappe.cache().hset(key, "reason", reason or "error")
    frappe.cache().hset(key, "locked", 1)
    if ttl and int(ttl) > 0:
        frappe.cache().expire(key, int(ttl))
    return {"ok": True}

@frappe.whitelist()
def get_lock_state():
    """Kullanıcı kilitli mi?"""
    key = _lock_key()
    locked = frappe.cache().hget(key, "locked")
    reason = frappe.cache().hget(key, "reason") or "error"
    return {"locked": bool(int(locked)) if locked is not None else False, "reason": reason}

@frappe.whitelist()
def clear_lock():
    """Kilidi kaldır (unlock)."""
    key = _lock_key()
    frappe.cache().delete(key)
    return {"ok": True}

@frappe.whitelist()
def verify_unlock_password(password: str):
    """Doğru parola ise kilidi aç."""
    try:
        expected = (frappe.conf or {}).get("qr_scanner_unlock_password")
        if not expected:
            return {"ok": False, "reason": "not_configured"}
        ok = hmac.compare_digest(str(password), str(expected))
        if ok:
            clear_lock()
        return {"ok": bool(ok)}
    except Exception:
        frappe.log_error("verify_unlock_password failed", "qr_scanner")
        return {"ok": False}

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
    """USB/klavye wedge taramalarını kaydeder.
    - Sunucu tarafı kilit açıksa 'locked' döner.
    - Duplicate bulunduğunda kilidi devreye alır ve 'duplicate' döner.
    - Genel hata durumunda kilidi devreye alır ve 'error' döner.
    """
    from frappe import _

    qr_code = (qr_code or "").strip()
    if not qr_code:
        frappe.throw(_("Empty QR code"))

    # 1) Kilit kontrolü (server authoritative)
    try:
        state = get_lock_state()  # aynı modülde: {"locked": bool, "reason": "..."}
        if state.get("locked"):
            return {"ok": False, "created": False, "reason": "locked"}
    except Exception:
        # Kilit sorgusu bile patlarsa, güvenlik gereği taramayı durdur
        frappe.log_error(frappe.get_traceback(), "QR Scanner: get_lock_state failed")
        return {"ok": False, "created": False, "reason": "locked"}

    # 2) Duplicate kontrolü
    try:
        if frappe.db.exists("QR Scan Record", {"qr_code": qr_code}):
            # Duplicate yakalandı → kilidi devreye al
            try:
                set_lock(reason="duplicate")  # aynı modülde: cache'e yazar
            except Exception:
                frappe.log_error(frappe.get_traceback(), "QR Scanner: set_lock duplicate failed")
            return {"ok": True, "created": False, "reason": "duplicate"}
    except Exception:
        # DB erişimi sırasında sorun → güvenli tarafta kal, kilitle
        frappe.log_error(frappe.get_traceback(), "QR Scanner: duplicate check failed")
        try:
            set_lock(reason="error")
        except Exception:
            pass
        return {"ok": False, "created": False, "reason": "error"}

    # 3) Kayıt oluşturma
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
        # Kayıt sırasında herhangi bir hata → kilitle
        frappe.log_error(frappe.get_traceback(), "QR Scanner: create_scan failed")
        try:
            set_lock(reason="error")
        except Exception:
            pass
        return {"ok": False, "created": False, "reason": "error"}