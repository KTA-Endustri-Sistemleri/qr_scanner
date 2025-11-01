# 📦 QR Scanner (ERPNext v15.81.1)

Scans QR labels using a **USB barcode scanner** ⌨️ and records them in ERPNext.  
On a **duplicate**, a **fullscreen red lock** appears — requires an **admin password** to continue.

---

## 🆕 What's New in v1.2.0 (Summary)
- **In-card opaque overlays** replace floating toasts:
  - 🔄 **Processing** → blue overlay (duration from `ui_cooldown_ms`)
  - ✅ **Saved** → green overlay (duration from `success_toast_ms`)
  - ⚠️ **Warning** → amber overlay (e.g., invalid QR length)
  - Overlays are fully opaque (no transparency) and **block input**, rendered *inside* the ERPNext card.
- **State machine UI**: predictable transitions via `setIdle()`, `setLoading()`, `setSuccess()`, `setWarning()`.
- **Small-screen lock UX** (≤ 420×720): password and unlock button stack vertically; unlock button is full-width.
- **33‑char validation**: Client-side rejects codes that are not exactly **33 characters** with a warning overlay; server returns `invalid_length`.
- **Device & client metadata**: Collected silently from the browser and stored per record (see *Metadata* below).

> ℹ️ No DB patch was added for this release. See **Migration** for simple reload/migrate steps. You may add a UNIQUE index for `qr_code` separately if you prefer, but it's optional here.

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
  - 🔄 **Processing** → blue in-card overlay (`ui_cooldown_ms`)
  - ✅ **Saved** → green in-card overlay (`success_toast_ms`)
  - ⚠️ **Warning** → amber in-card overlay (e.g., invalid QR length — must be **33 chars**)
  - 🔁 **Duplicate** → fullscreen **red lock** appears; enter admin password.

**Quality of life**
- Auto-focus restores on blur
- Rapid repeats ignored (**debounce**)
- Lock screen remembers state until unlocked
- Inputs disabled during processing
- Client device info (model, platform) now auto-collected (no UI field)
- Fully opaque overlays block input and focus

---

## ⚙️ QR Scan Settings (Single DocType)
Centralized configuration for all client behaviors:
- `success_toast_ms` → Success overlay duration
- `ui_cooldown_ms` → Processing overlay duration
- `beep_enabled`, `vibrate_enabled` → Enable/disable sound/vibration
- `debounce_ms` → Minimum interval between scans
- `autofocus_back` → Auto-refocus input
- `silence_ms` → Silence window for auto-submit
- `lock_on_duplicate` → Enable/disable lock on duplicates
- `unlock_password` → Admin password (server-side verified)

> ⚡ `site_config.json`’s `qr_scanner_unlock_password` is used as fallback.  
> The `get_client_settings` API exposes these safely to the frontend.

---

## 🧩 Metadata
Each record stores device and client info (structured fields + JSON):
- `device_label`, `device_model`, `device_vendor`, `device_uuid`
- `client_platform`, `client_lang`, `client_hw_threads`, `client_screen`, `client_user_agent`
- Additional raw payload can still be stored in `metadata` (JSON) if needed.
- All sent via `client_meta` automatically — **no UI required**.

---

## 🔧 Migration (v1.2.0)
No patch file was created for this release. Perform a simple reload + migrate so new fields are available:

```bash
bench --site your.site reload-doc "QR Scanner" doctype qr_scan_record
bench --site your.site migrate
```

> Optional (recommended at scale): add a **UNIQUE** index on `qr_code` to harden duplicate protection. This can be done later via your DBA/process; not required for this version.

---

## 🔐 Permissions
Access to both **page** and **API** is granted to:
- `System Manager`
- `QR Scanner User`
- `QR Scanner Manager`

---

## 🧪 Duplicate Behavior
- Duplicates are never reinserted.
- You can enforce a **UNIQUE index** on `qr_code` in `QR Scan Record` if desired.

---

## 🔒 Lock & Password
- On duplicate → **fullscreen red lock**
- Verified via `qr_scanner.api.verify_unlock_password`
- Password can be configured via `QR Scan Settings` or `site_config.json`
- Client lock persists until correctly unlocked

---

## 🧩 Troubleshooting
| Issue | Fix |
|--------|------|
| Page not visible | `bench reload-doc "QR Scanner" page qr_scanner` |
| Permission denied | Ensure System Manager / QR Scanner roles |
| Duplicate check fails | Consider adding a DB UNIQUE index on `qr_code` |
| Lock not opening | Verify `lock_on_duplicate` setting |
| No password set | Fill `Unlock Password` in QR Scan Settings |
| Overlay timing | Adjust `ui_cooldown_ms` / `success_toast_ms` |
| Invalid length warning | Code must be **exactly 33 characters** | 