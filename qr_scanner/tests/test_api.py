import frappe
from frappe.tests.utils import FrappeTestCase
from qr_scanner.qr_scanner.api import create_scan, get_locked_users, remote_unlock, verify_unlock_password

class TestQRScannerAPI(FrappeTestCase):
    def setUp(self):
        """Prepare testing environment: User, Roles, Settings"""
        self.test_user = "test_qrscanner@example.com"
        
        if not frappe.db.exists("User", self.test_user):
            user = frappe.get_doc({
                "doctype": "User",
                "email": self.test_user,
                "first_name": "Test",
                "last_name": "QR Scanner",
                "send_welcome_email": 0
            }).insert(ignore_permissions=True)
            
        frappe.set_user(self.test_user)
        
        # Ensure QR Scan Settings exists and is configured for locking
        if not frappe.db.exists("QR Scan Settings", "QR Scan Settings"):
            frappe.get_doc({
                "doctype": "QR Scan Settings",
                "lock_on_duplicate": 1,
                "unlock_password": "admin"
            }).insert(ignore_permissions=True)
            
        frappe.db.set_value("QR Scan Settings", "QR Scan Settings", "lock_on_duplicate", 1)
        frappe.db.set_value("QR Scan Settings", "QR Scan Settings", "unlock_password", "admin")
        
        # Reset any existing records
        frappe.db.sql("DELETE FROM `tabQR Scan Record`")
        frappe.db.set_value("User", self.test_user, "custom_qr_locked", 0)

    def tearDown(self):
        """Clean up database after tests"""
        frappe.set_user("Administrator")
        frappe.db.set_value("User", self.test_user, "custom_qr_locked", 0)
        frappe.db.sql("DELETE FROM `tabQR Scan Record`")

    def test_1_create_valid_scan(self):
        """Test scanning a valid 33-character QR Code"""
        valid_code = "123456789012345678901234567890123"
        res = create_scan(valid_code)
        self.assertEqual(res.get("status"), "success")
        
        # Ensure it exists in the database
        self.assertTrue(frappe.db.exists("QR Scan Record", {"qr_code": valid_code}))

    def test_2_invalid_length(self):
        """Test scanning a code that is not 33 characters long"""
        res = create_scan("123")
        self.assertEqual(res.get("status"), "invalid_length")

    def test_3_duplicate_locking(self):
        """Test that scanning a duplicate locks the user (Server Side Lock requirement)"""
        valid_code = "DUPLICATETESTCODE1234567890123456"
        
        # First scan -> Success
        res1 = create_scan(valid_code)
        self.assertEqual(res1.get("status"), "success")
        
        # Second scan -> Duplicate Error
        res2 = create_scan(valid_code)
        self.assertEqual(res2.get("status"), "duplicate")
        
        # Verify Server-Side Lock was triggered on the User
        is_locked = frappe.db.get_value("User", self.test_user, "custom_qr_locked")
        self.assertEqual(is_locked, 1)

    def test_4_verify_unlock_password(self):
        """Test that the correct password unlocks the user and the wrong one doesn't"""
        frappe.db.set_value("User", self.test_user, "custom_qr_locked", 1)
        
        # Wrong password
        res_wrong = verify_unlock_password("wrongpassword")
        self.assertEqual(res_wrong.get("ok"), False)
        self.assertEqual(frappe.db.get_value("User", self.test_user, "custom_qr_locked"), 1)
        
        # Correct password
        res_correct = verify_unlock_password("admin")
        self.assertEqual(res_correct.get("ok"), True)
        self.assertEqual(frappe.db.get_value("User", self.test_user, "custom_qr_locked"), 0)

    def test_5_get_locked_users_and_remote_unlock(self):
        """Test the manager remote unlocking features"""
        frappe.db.set_value("User", self.test_user, "custom_qr_locked", 1)
        
        # Switch to Administrator who has System Manager role to test getting locked users
        frappe.set_user("Administrator")
        locked_users = get_locked_users()
        
        # Assert at least our test user is returned in the list
        self.assertTrue(any(u.get("name") == self.test_user for u in locked_users))
        
        # Test Remote Unlock execution
        res = remote_unlock(self.test_user)
        self.assertEqual(res.get("ok"), True)
        
        # Ensure the target user is actively unlocked
        self.assertEqual(frappe.db.get_value("User", self.test_user, "custom_qr_locked"), 0)
