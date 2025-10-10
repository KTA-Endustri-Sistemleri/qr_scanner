import frappe

def execute():
    cols = frappe.db.get_table_columns("QR Scan Record") or []
    for col in ("linked_doctype", "linked_docname"):
        if col in cols:
            frappe.db.sql(f"ALTER TABLE `tabQR Scan Record` DROP COLUMN `{col}`")