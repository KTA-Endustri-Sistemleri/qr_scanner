import frappe
def _reload():
    frappe.reload_doc("QR Scanner", "page", "qr_scanner")
def after_install():
    _reload()
def after_migrate():
    _reload()