import frappe
from frappe.model.document import Document

CACHE_KEY = "qr_scanner:client_settings"

class QRScanSettings(Document):
    def on_update(self):
        # DocType kendi kaydedildiğinde cache'i temizle (otomatik çağrılır)
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
            "lock_on_duplicate":1 if doc.get("lock_on_duplicate") else 0,
            # YENİ: UI Loading / Cooldown
            "loading_enabled":  1 if doc.get("loading_enabled") else 0,
            "ui_cooldown_ms":   int(doc.get("ui_cooldown_ms") or 1000),
        }
        cache.set_value(CACHE_KEY, safe, expires_in_sec=60)
        data = safe
    return data

# --- Hook için fonksiyon (sınıf metodu yerine fonksiyon yolu verilecektir)
def settings_on_update(doc, method):
    try:
        frappe.cache().delete_value(CACHE_KEY)
    except Exception:
        pass