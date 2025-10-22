# 📦 QR Scanner (ERPNext v15.81.1)

Scans QR labels with a **USB barcode scanner** ⌨️ and records them in ERPNext.  
Blocks **duplicates** and, on duplicate, shows a **fullscreen red lock** that requires an **admin password** to continue.

---

## 🧰 Installation
```bash
cd ~/frappe-bench
bench get-app qr_scanner https://github.com/KTA-Endustri-Sistemleri/qr_scanner.git
bench --site your.site install-app qr_scanner
bench --site your.site migrate
bench build && bench restart
# Password used by the fullscreen lock (client asks server to verify)
bench set-config -g qr_scanner_unlock_password "changeit"
```

> ⚙️ If you deploy with Docker and split frontend/backend containers,  
> run `bench build` in the **frontend** container and `migrate` in the **backend** container.

---

## ▶️ Usage
- Open the **QR Scanner** page in Desk: `https://your.site/app/qr-scanner`
- Scan using a **USB keyboard-wedge** scanner (or type and press **Enter**).
- Feedback:
  - ✅ **Success** → green toast (auto-closes in ~1–2s)
  - 🔁 **Duplicate** → **fullscreen red lock** appears. Enter the admin password to continue scanning.

**Quality of life**
- Input auto-refocuses if it loses focus.
- Rapid repeated codes are ignored (debounce).
- After unlock: input is re-enabled, internal state is reset.
- Password field is always **cleared on every lock** (autofill disabled).

---

## 🔐 Permissions
- Access to the **page** and **API** is restricted to these roles:
  - `System Manager`
  - `QR Scanner User`
  - `QR Scanner Manager`
- You can further adjust Doctype and API permissions as needed.

---

## 🧪 Duplicate Behavior
- Server checks for duplicates; a duplicate QR is **not inserted**.
- For concurrency safety, add a **UNIQUE index** on the `qr_code` field of `QR Scan Record`.

---

## 🔒 Lock & Password
- Duplicate → **fullscreen red lock**
- Password is verified via `qr_scanner.api.verify_unlock_password`
- Correct password hides the lock (client-side lock, no server cache)
- Password is stored in `site_config.json` (`qr_scanner_unlock_password`)

> ⚡ Server no longer keeps a persistent lock.  
> This improves responsiveness and avoids cache desync.  
> Password check still happens server-side for security.

---

## 🧩 Quick Troubleshooting
| Symptom | Fix |
|----------|------|
| Page not visible | `bench reload-doc "QR Scanner" page qr_scanner` |
| Permission error | Check role assignment: System Manager, QR Scanner User, QR Scanner Manager |
| Duplicate not blocked | Ensure UNIQUE index on `qr_code` |
| Lock not unlocking | Verify `qr_scanner_unlock_password` in site config |
| Scanner stops after lock | Update JS; it now resets debounce/inFlight and clears password field |

---

## 🗺️ Roadmap
1. **⚙️ QR Scanner Settings (Single DocType)**  
   Manage UI preferences: `success_toast_ms`, `beep_enabled`, `vibrate_enabled`, `debounce_ms`, `autofocus_back`, `silence_ms`, etc.  
   **API:** `qr_scanner.api.get_client_settings`
2. **⚡ Auto-Submit Without Enter (USB burst detection)**  
   Detects typing bursts and auto-submits after silence (configurable).