# System Patterns

## System Architecture
The application follows a decoupled SPA (Single Page Application) pattern integrated into the Frappe Framework:
- **Backend (Frappe/Python)**: Handles data modeling, validation, and database operations.
- **Frontend (Vue 3)**: Mounted within a standard Frappe Page wrapper. Manages all state, debouncing, device telemetry, and UI rendering independent of standard Frappe Desk UI conventions.

## Key Technical Decisions
1. **Vue 3 + Composition API + Pinia**: Chosen for the frontend to maintain strict control over the UI state machine, which is critical for scanner environments where timing and focus must be perfectly managed.
2. **In-Card Opaque Overlays**: Instead of global toasts, overlays render *inside* the scanner card and physically cover the input elements to prevent race conditions or accidental secondary scans during `ui_cooldown_ms`.
3. **Server-Side UI Lock**: To ensure terminal-level security against cache clearing bypasses, UI lock states are managed completely via the backend in the User doctype via a `custom_qr_locked` check field. Cache invalidation on Frappe's Redis server is bypassed intentionally using `update_modified=False`.
4. **Server-Side Fallback Configurations**: Using `site_config.json` as a fallback for the unlock password (`qr_scanner_unlock_password`) ensures the lock mechanism functions even if the `QR Scan Settings` DocType is incomplete.
5. **Silent Telemetry**: Client device and IP metadata are calculated on the fly via `_extract_client_ip()` and injected into `client_meta` without user awareness, ensuring pristine audit logs.

## Design Patterns
- **State Machine UI**: The Vue app clearly defines bounded states (`Idle`, `Processing`, `Success`, `Warning`, `Locked`).
- **Defensive API Design**: Python API endpoints gracefully degrade. `get_client_settings` wraps DocType lookups in `try/except` and falls back to safe hardcoded defaults if the table mapping is missing.

## Component Relationships
- **`qr_scanner/api.py`**: The central nervous system for client-server communication. Exposes `get_client_settings`, `create_scan`, and `verify_unlock_password`.
- **`QR Scan Record` (DocType)**: The transaction table capturing the code, scanner method, and metadata.
- **`QR Scan Settings` (DocType)**: The single-source-of-truth configuration panel for timeouts, lock behaviors, and haptic feedback. Triggers cache clearing on update.
- **Frontend UI**: Fetches settings on load, then continuously cycles between scan actions and API mutations.
