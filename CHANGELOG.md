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