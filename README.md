# 📦 QR Scanner (ERPNext v15.81.1)

Scans QR labels using a **USB barcode scanner** ⌨️ and records them in ERPNext.  
On a **duplicate**, a **fullscreen red lock** appears — requires an **admin password** to continue.

---

## 🧰 Installation
```bash
cd ~/frappe-bench
bench get-app qr_scanner https://github.com/KTA-Endustri-Sistemleri/qr_scanner.git
bench --site your.site install-app qr_scanner
bench --site your.site migrate
bench build && bench restart
```
> 🐳 **In Docker setups:**  
> - Run `bench build` inside the **frontend** container  
> - Run `bench migrate` inside the **backend/site** container

---

## ▶️ Usage
- Open the **QR Scanner** page: `https://your.site/app/qr-scanner`  
- Scan with a **USB keyboard-wedge** scanner or type manually and press **Enter**.  
- Feedback:
  - ✅ **Success** → green toast (auto-closes after ~1–2s)  
  - 🔁 **Duplicate** → fullscreen **red lock** appears; enter the admin password to continue.

**Quality of life**
- Input auto-refocuses when it loses focus  
- Repeated quick scans are ignored (**debounce**)  
- After unlocking: input re-enables and state resets  
- Password field is always **cleared** (autofill disabled)

---

## ⚙️ QR Scan Settings (Single DocType)
Centralized configuration for all client behaviors:
- `success_toast_ms` → Toast duration  
- `beep_enabled`, `vibrate_enabled` → Enable/disable audio or vibration feedback  
- `debounce_ms` → Minimum interval between scans  
- `autofocus_back` → Auto-focus on the input field  
- `silence_ms` → Silence window for auto-submit  
- `lock_on_duplicate` → Enable/disable lock on duplicates  
- `unlock_password` → Admin password (verified server-side)

> ⚡ `site_config.json`’s `qr_scanner_unlock_password` is used as a fallback.  
> The `get_client_settings` API exposes these settings to the front-end.

---

## 🔐 Permissions
Access to both **page** and **API** is granted to:
- `System Manager`
- `QR Scanner User`
- `QR Scanner Manager`

You can still customize Doctype and API permissions as needed.

---

## 🧪 Duplicate Behavior
- Duplicates are never inserted again.  
- For concurrency safety, ensure a **UNIQUE index** on the `qr_code` field of `QR Scan Record`.

---

## 🔒 Lock & Password
- On duplicate → **fullscreen red lock**  
- Password is verified via `qr_scanner.api.verify_unlock_password`  
- Successful unlock closes the lock (client-side only, no Redis cache)  
- Password can be configured via `QR Scan Settings` or `site_config.json`

> 🔒 Persistent server locks were removed for better speed and stability.  
> Passwords remain verified server-side for security.

---

## 🧩 Quick Troubleshooting
| Issue | Fix |
|--------|------|
| Page not visible | `bench reload-doc "QR Scanner" page qr_scanner` |
| Permission denied | Check roles: System Manager, QR Scanner User, QR Scanner Manager |
| Duplicate check fails | Ensure UNIQUE index on `qr_code` |
| Lock not opening | Check `lock_on_duplicate` in settings |
| No password set | Fill in the `Unlock Password` in QR Scan Settings |
| Scanner stuck after lock | Update JS — password input now resets correctly |
