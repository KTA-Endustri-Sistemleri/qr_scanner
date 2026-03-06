## [1.3.1] - 2026-03-06
### 🔒 Security / Database Hardening
- **Server-Side UI Locking**: Migrated the lock screen boolean tracking from client-side `localStorage` to Frappe's database (`custom_qr_locked` on the `User` DocType) completely neutralizing cache-clearing circumvention.
- **Race Condition Immunity**: Enforced a `UNIQUE` SQL index on the `qr_code` field inside the `QR Scan Record` table via `make_property_setter`. Backend now safely captures `frappe.UniqueValidationError` to trigger lock screens.

### ✨ Administrative Features
- **Remote Unlock Dashboard (WebSocket)**: Added a new `QR Scanner Manager` administrative panel (`/app/qr-scanner-locked-users`) powered by Vue 3.
- Managers can now observe actively locked factory terminals in real time and hit **"Unlock"** to drop the operator's red lock screen remotely via `frappe.publish_realtime('qr_unlock_remote')` websockets.

---

## [1.3.0] - 2025-11-17
### ♻️ Internal Refactor / Frontend
- Migrated desk page UI to **Vue 3 + TypeScript + Pinia** while preserving original behaviors:
  - In-card **opaque overlays** (loading/success/warning) with same timings (`ui_cooldown_ms`, `success_toast_ms`)
  - **Duplicate → fullscreen red lock** flow unchanged (persist + unlock watchdog)
  - **33-char validation** & debounce kept client-side; server `invalid_length` handled
  - **Haptics** (beep/vibrate) extracted into `haptics.ts`
  - **Device meta** collection split into composables (background model resolution + UA)
- Introduced a small **page loader** that `frappe.require`’dan sonra `window.qrScanner.mount(...)` çağırır.
- All overlays & lock are **scoped styles** inside components (no global leakage).

### 🔧 Build & Bundling
- Single entry bundle: `qr_scanner.bundle.js` (TS/ESM).
- `window.qrScanner = { mount }` exposed for `frappe.pages['qr_scanner']` boot.
- No server-side schema changes.

### ⚠️ Compatibility
- Backward compatible. If you previously hotlinked old JS, switch to `frappe.require(['qr_scanner/qr_scanner.bundle.js', 'qr_scanner.bundle.js'])`.

### 🚀 Upgrade
```bash
bench build && bench restart
# gerekirse cache:
bench clear-cache
```

---

## [1.2.0] - 2025-11-01
### ✨ UI/UX
- **In-card opaque overlays** replace floating toasts:
  - 🔄 **Processing** → blue overlay (duration from `ui_cooldown_ms`)
  - ✅ **Success** → green overlay (duration from `success_toast_ms`)
  - ⚠️ **Warning** → amber overlay (e.g., invalid QR length)
  - Overlays are fully opaque (no transparency) and **block input** during display.
  - Accessible ARIA roles/live regions added; overlays render **inside** the existing ERPNext card without altering default styling.
- **State machine helpers**: `setIdle()`, `setLoading()`, `setSuccess()`, `setWarning()` for predictable transitions.
- **Small-screen lock UX** (≤ 420×720): password + button stack vertically; Unlock button becomes 100% width.
- **Focus & feedback**: input auto-refocuses after flows; beep/vibrate maintained per settings.

### 📊 Record Details
- **Device/Client metadata** persisted on each scan (from `client_meta`):
  - `device_label`, `device_model`, `device_vendor`, `device_uuid`
  - `client_platform`, `client_lang`, `client_hw_threads`, `client_screen`, `client_user_agent`
- **Client-side validation**: QR code must be **exactly 33 characters** (warning overlay).  
  Server returns `invalid_length` for mismatches.

### 🧩 Internal / Refactor
- Desk page rebuilt as **class-based** (`QRScannerPage`) for clarity and testability.
- Non-critical tasks deferred (settings fetch, device model resolution) to keep first paint snappy.
- Moved jQuery-dependent DOM ops out of hot paths; plain JS for critical interactions.
- Timers and audio contexts are cleaned up reliably to avoid leaks.

### 🛠️ Migration
- **DocType change**: `QR Scan Record` updated with new device/client fields.
- **Index**: Ensure a **UNIQUE** index on `qr_code` (idempotent patch provided in `MIGRATION.md`).

### ⚙️ Version
- Bump: `1.1.1 → 1.2.0`
- Backward compatible after migration.

---

## [1.1.1] - 2025-10-25
### ✨ Improved UI & UX
- **Card Overlay System**  
  - Replaced old floating toasts with full-card **opaque overlays**.  
  - Blue overlay for **“Processing”**, green overlay for **“Success”**, fully blocking the input area.  
  - Overlays now use durations from:
    - `ui_cooldown_ms` → loading phase duration
    - `success_toast_ms` → success phase duration
  - Each overlay is opaque (no transparency) and includes accessible ARIA labels for better screen reader support.  
  - ERPNext’s default card design remains intact — overlays are drawn **inside** the existing card container.

- **State Machine Refactor**  
  - Added clean helper methods: `setIdle()`, `setLoading()`, and `setSuccess()` for UI transitions.  
  - Debounce, lock, and cooldown logic fully isolated for stability.

- **Enhanced Feedback Flow**  
  - Visual feedback no longer relies on toasts.  
  - Beep/vibrate still triggered as configured in `QR Scan Settings`.  
  - The user can configure overlay durations via settings without changing code.

### 🧩 Internal
- `qr_scanner/public/js/qr_scanner.js` fully refactored for clarity and performance.  
- Both cooldown and success overlay durations are now dynamically fetched from server settings.  
- Animations made smoother, with better cleanup of async timers.  
- UI is fully responsive — adapts to various container widths and dark mode.

### ⚙️ Version
- Bump: `1.1.0 → 1.1.1`
- Fully backward compatible; migration not required.

---

## [1.1.0] - 2025-10-24
### 🚀 Added
- **QR Scanner Workspace**  
  - New Workspace created (`QR Scanner`)  
  - Contents:
    - **QR Scanner Page** → Main scanning interface  
    - **QR Scanner Log** → Scan history  
    - **QR Scanner Settings** → Client-side configuration panel  
  - Workspace is automatically imported during install and migrate events via `install.py`.  
  - `MANIFEST.in` and `setup.py` updated to package workspace JSON with the app.

### 🧩 Internal
- `install.py` refactored:
  - `_import_workspace_json()` added  
  - Workspace JSON (`qr_scanner.json`) now imported automatically on install.  
  - Roles (`QR Scanner User`, `QR Scanner Manager`) and default settings are ensured at setup.  
- Minor version bump: `1.0.0 → 1.1.0`

### ⚙️ Compatibility
- Fully backward compatible.  
- Existing sites will auto-import Workspace after `bench migrate`.

---