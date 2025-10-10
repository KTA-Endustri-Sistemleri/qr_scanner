import frappe

def execute():
    # İşaretle & reddet (varsa) duplicate kayıtlar
    dupes = frappe.db.sql("""
        SELECT qr_code FROM `tabQR Scan Record`
        WHERE qr_code IS NOT NULL AND qr_code!=''
        GROUP BY qr_code HAVING COUNT(*)>1
    """)
    for (code,) in dupes:
        rows = frappe.db.sql("""
            SELECT name FROM `tabQR Scan Record`
            WHERE qr_code=%s ORDER BY creation ASC
        """, (code,))
        for name in [r[0] for r in rows[1:]]:
            frappe.db.set_value("QR Scan Record", name, "is_duplicate", 1)
            frappe.db.set_value("QR Scan Record", name, "status", "Rejected")

    # Unique index
    frappe.db.sql("""
        ALTER TABLE `tabQR Scan Record`
        ADD UNIQUE INDEX IF NOT EXISTS `uniq_qr_code` (qr_code)
    """)