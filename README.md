# 📦 QR Scanner (ERPNext v15.81.1)

Scans QR labels from a **USB barcode scanner** ⌨️ and records them in ERPNext. Automatically blocks **duplicate** entries 🚫.

---

## 🧰 Installation
```bash
cd ~/frappe-bench
bench get-app qr_scanner https://github.com/KTA-Endustri-Sistemleri/qr_scanner.git
bench --site your.site install-app qr_scanner
bench --site your.site migrate
bench build && bench restart
bench set-config -g qr_scanner_unlock_password "changeit"
```

---

## ▶️ Usage
- Open the **QR Scanner** page in Desk: `https://your.site/app/qr-scanner`  
- Scan with a **USB scanner**.  
- Results appear via **toast** notifications:  
  - ✅ **Success** → green, auto-closes after 1–2 seconds.  
  - 🔁 **Duplicate** → red, stays until the user closes it.

> 💡 **Tip:** If the USB scanner loses focus, the input will auto-refocus. For rapid scans, repeated reads of the same code within a short interval are ignored (debounce).

---

## 🔐 Permissions
- The page and API can be restricted to **System Manager** by default (and optionally `QR Scanner User`).  
- Adjust Doctype and endpoint permissions per your needs.

---

## 🧪 Duplicate Behavior
- The server performs a duplicate check; a duplicate QR code is **not saved** again.  
- For concurrent scans, a **UNIQUE index** on the `qr_code` field is recommended to ensure data integrity.

---

## 🧩 Quick Troubleshooting
- 🖥️ **Page not visible:** `reload-doc` → `bench --site your.site reload-doc "QR Scanner" page qr_scanner`  
- 🔑 **Permission error:** Verify role assignments (System Manager / QR Scanner User).  
- 🔁 **Duplicate not working as expected:** Ensure a UNIQUE index on `qr_code` and race-safe inserts in the API.

---

## 🗺️ Planned Features (Roadmap)
1. **⚙️ QR Scanner Settings (Single DocType)**  
   Manage settings from the UI:  
   `success_toast_ms`, `duplicate_sticky`, `beep_enabled`, `vibrate_enabled`, `debounce_ms`, `autofocus_back`.  
   **API:** `qr_scanner.api.get_client_settings` will override JS defaults from the server.

2. **⚡ Auto-Submit Without Enter (USB “burst” detection)**  
   Detects rapid key bursts from the scanner and auto-submits after a short **silence**.  
   Configurable thresholds: `silence_ms`, `min_len`, `burst_threshold_ms`, `burst_min_keys` (preferably via Settings).