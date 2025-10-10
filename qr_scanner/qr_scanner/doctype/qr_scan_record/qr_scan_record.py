import frappe
from frappe.model.document import Document

class QRScanRecord(Document):
    def validate(self):
        self.qr_code = (self.qr_code or "").strip()
        if not self.qr_code:
            frappe.throw("QR Code is required")
