import frappe
from frappe.model.document import Document

CACHE_KEY = "qr_scanner:client_settings"

class QRScanSettings(Document):
    def on_update(self):
        # settings kaydedilince client cache temizle
        try:
            frappe.cache().delete_value(CACHE_KEY)
        except Exception:
            pass

def get_cached_settings():
    """Ayarları 60sn cache'le (parola hariç)."""
    cache = frappe.cache()
    data = cache.get_value(CACHE_KEY)
    if not data:
        doc = frappe.get_single("QR Scan Settings").as_dict()
        safe = {
            "success_toast_ms": int(doc.get("success_toast_ms") or 1500),
            "beep_enabled":     1 if doc.get("beep_enabled") else 0,
            "vibrate_enabled":  1 if doc.get("vibrate_enabled") else 0,
            "debounce_ms":      int(doc.get("debounce_ms") or 800),
            "autofocus_back":   1 if doc.get("autofocus_back") else 0,
            "silence_ms":       int(doc.get("silence_ms") or 120),
            "lock_on_duplicate":1 if doc.get("lock_on_duplicate") else 0
            # parola bilinçli olarak dönülmüyor
        }
        cache.set_value(CACHE_KEY, safe, expires_in_sec=60)
        data = safe
    return data
