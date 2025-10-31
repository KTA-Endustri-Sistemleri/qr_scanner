# qr_scanner/api.py
import hmac
import json
import frappe
from frappe import _
from frappe.utils.password import get_decrypted_password

@frappe.whitelist()
def get_client_settings():
    """
    İstemciye güvenli ayarları döner (parola ASLA dönmez).
    QR Scan Settings'ten okumaya çalışır; import/okuma hatasında defaults verir.
    """
    # Güvenli defaults
    defaults = {
        "success_toast_ms": 1500,
        "beep_enabled": 1,
        "vibrate_enabled": 1,
        "debounce_ms": 800,
        "autofocus_back": 1,
        "silence_ms": 120,
        "lock_on_duplicate": 1,
        # UI Loading / Cooldown
        "loading_enabled": 1,
        "ui_cooldown_ms": 1000,
    }

    try:
        # DocType helper'ı import et (hata alırsa defaults'a düşeceğiz)
        from qr_scanner.qr_scanner.doctype.qr_scan_settings.qr_scan_settings import get_cached_settings
        data = get_cached_settings() or {}
        # Beklenmeyen tipler için defansif merge
        if not isinstance(data, dict):
            return defaults
        # defaults üzerinde gelenleri uygula (bilinmeyen anahtarları görmezden gel)
        for k in defaults.keys():
            if k in data and data.get(k) is not None:
                defaults[k] = data.get(k)
        return defaults
    except Exception:
        # Buraya düşüyorsa ya import yolu hatalıdır ya da DocType henüz migrate edilmemiştir
        return defaults


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


def _extract_client_ip():
    """
    Proxy/CDN arkasında en isabetli IP yakalama.
    Öncelik:
      1) frappe.local.request_ip
      2) X-Forwarded-For (ilk değer)
      3) CF-Connecting-IP / X-Real-IP
      4) request.remote_addr (fallback)
    """
    try:
        # 1) Doğrudan
        ip = getattr(frappe.local, "request_ip", None)
        if ip:
            return ip

        # 2-4) Header / fallback
        req = getattr(frappe.local, "request", None)
        headers = (req.headers if req and hasattr(req, "headers") else None) or {}

        xff = headers.get("X-Forwarded-For")
        if xff:
            # "client, proxy1, proxy2" -> ilk
            return xff.split(",")[0].strip()

        ip = headers.get("CF-Connecting-IP") or headers.get("X-Real-IP")
        if ip:
            return ip

        return getattr(req, "remote_addr", None)
    except Exception:
        return None


@frappe.whitelist()
def create_scan(qr_code, scanned_via="USB Scanner", device_id=None, client_meta=None):
    """
    QR Scan Record oluşturur ve istemci/cihaz metadatalarını doldurur.

    Args:
      qr_code (str)          : Zorunlu
      scanned_via (str)      : 'USB Scanner' | 'Mobile Camera' | 'Manual' | 'API'
      device_id (str|None)   : Geriye dönük param (varsa yazılır)
      client_meta (dict|json): {
          "input_method": "USB Scanner" | "Manual" | "API" | "Mobile App",
          "device_uuid": "...",
          "device_label": "...",
          "device_vendor": "...",
          "device_model": "...",
          "client_platform": "...",
          "client_lang": "...",
          "client_hw_threads": 8,
          "client_screen": "1920x1080",
          "client_user_agent": "Mozilla/5.0 ..."
      }
    """
    qr_code = (qr_code or "").strip()
    if not qr_code:
        frappe.throw(_("Empty QR code"))

    # client_meta JSON string geldiyse parse et
    if isinstance(client_meta, str):
        try:
            client_meta = json.loads(client_meta)
        except Exception:
            client_meta = None
    if not isinstance(client_meta, dict):
        client_meta = {}

    # Duplicate kısa devre
    if frappe.db.exists("QR Scan Record", {"qr_code": qr_code}):
        return {"ok": True, "created": False, "reason": "duplicate"}

    # Sunucuda IP yakala
    ip_addr = _extract_client_ip()

    # tip güvenliği (int)
    def _ival(v):
        try:
            return int(v) if v is not None else None
        except Exception:
            return None

    try:
        doc = frappe.get_doc({
            "doctype": "QR Scan Record",
            # core
            "qr_code": qr_code,
            "scanned_via": scanned_via,
            "device_id": device_id,
            "scanned_by": frappe.session.user,
            "status": "Validated",
            "is_duplicate": 0,

            # Device & Client (qr_scan_record.json ile birebir)
            "input_method": client_meta.get("input_method"),
            "device_uuid": client_meta.get("device_uuid"),
            "device_label": client_meta.get("device_label"),
            "device_vendor": client_meta.get("device_vendor"),
            "device_model": client_meta.get("device_model"),

            "client_platform": client_meta.get("client_platform"),
            "client_lang": client_meta.get("client_lang"),
            "client_hw_threads": _ival(client_meta.get("client_hw_threads")),
            "client_screen": client_meta.get("client_screen"),
            "client_user_agent": client_meta.get("client_user_agent"),
            "ip_address": ip_addr,

            # İstersen ham blob'u da tutabilirsin:
            # "metadata": json.dumps(client_meta, ensure_ascii=False)
        })
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return {"ok": True, "created": True, "name": doc.name}
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "QR Scanner: create_scan failed")
        # >>> buradaki msg istemcide gösterilecek
        return {"ok": False, "created": False, "reason": "error", "msg": str(e)}