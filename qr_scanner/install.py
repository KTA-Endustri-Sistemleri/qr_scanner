import os
import frappe
from frappe.modules.import_file import import_file_by_path


def _reload_all():
    # Not: reload_doc 'module' paramı app package adıdır (qr_scanner)
    try:
        frappe.reload_doc("qr_scanner", "page", "qr_scanner")
    except Exception:
        frappe.log_error("reload page qr_scanner failed", "qr_scanner")

    # Single DocType
    try:
        frappe.reload_doc("qr_scanner", "doctype", "qr_scan_settings")
    except Exception:
        frappe.log_error("reload doctype qr_scan_settings failed", "qr_scanner")


def _ensure_roles():
    """
    Opsiyonel: Sistemde roller yoksa oluştur.
    Sayfa/permission tarafında bu rolleri kullandığınız için
    ortam yeni ise güvenceye alır.
    """
    required = ["QR Scanner User", "QR Scanner Manager"]
    for role in required:
        if not frappe.db.exists("Role", role):
            doc = frappe.get_doc({
                "doctype": "Role",
                "role_name": role,
                "desk_access": 1
            })
            doc.insert(ignore_permissions=True)
    frappe.db.commit()


def _ensure_settings_defaults():
    """
    QR Scan Settings Single için makul varsayılanları yazar.
    Parola burada set edilmez (güvenlik açısından Admin UI’dan girin).
    """
    try:
        doc = frappe.get_single("QR Scan Settings")
        defaults = {
            "success_toast_ms": 1500,
            "beep_enabled": 1,
            "vibrate_enabled": 1,
            "debounce_ms": 800,
            "autofocus_back": 1,
            "silence_ms": 120,
            "lock_on_duplicate": 1,
        }
        dirty = False
        for k, v in defaults.items():
            if doc.get(k) in (None, ""):
                doc.set(k, v)
                dirty = True
        if dirty:
            doc.save(ignore_permissions=True)
            frappe.db.commit()
    except Exception:
        frappe.log_error("ensure settings defaults failed", "qr_scanner")


def _import_workspace_json():
    """
    Uygulama ile ship edilen workspace JSON'unu (qr_scanner.json) içe alır.
    Dosya yoksa sessizce geçer. Mevcut kaydı günceller.
    """
    try:
        path = frappe.get_app_path("qr_scanner", "qr_scanner", "workspace", "qr_scanner.json")
        if os.path.exists(path):
            import_file_by_path(
                path,
                ignore_version=True,
                reset_permissions=False,
                for_sync=True,          # migrate/install senkronizasyonu gibi davran
            )
            frappe.db.commit()
    except Exception:
        frappe.log_error("import workspace json failed", "qr_scanner")


def after_install():
    _reload_all()
    _ensure_roles()               # istersen yorumlayabilirsin
    _ensure_settings_defaults()
    _import_workspace_json()      # Workspace'i içe al


def after_migrate():
    _reload_all()
    _ensure_roles()               # istersen yorumlayabilirsin
    _ensure_settings_defaults()
    _import_workspace_json()      # migrate sonrası güncel workspace'i içe al