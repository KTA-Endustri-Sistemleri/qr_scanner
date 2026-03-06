# Active Context

## Current Work Focus
The current focus is on maintaining and securing the `qr_scanner` application. Recently, we patched a security loophole in the lock-screen mechanism by migrating the lock state from the client's `localStorage` tracking over to the backend using a silent database technique.

## Recent Changes
- Migrated the frontend lock state from `localStorage` to a server-side DB flag to prevent users from bypassing the lock by clearing browser cache.
- Rebuilt frontend using **Vue 3 + TypeScript + Pinia**.
- Implemented **state machine UI** (idle, loading, success, warning).
- Enforced **33-character validation** on the client side (with warning overlay) and the server side (`invalid_length`).
- Overhauled the lock screen UX for small devices (stacked password and full-width unlock button for ≤ 420x720 screens).
- Replaced Frappe's native floating toasts with **in-card opaque overlays** to ensure the operator cannot interact with or be distracted by the input field during processing or cooldown periods.
- Added silent collection of **device and client metadata** (e.g., UUID, platform, OS) sent via the `client_meta` payload to the backend.

## Next Steps
- Monitor the recent deployment of the server-side lock feature for any edge cases.
- Optionally add a **UNIQUE index** on the `qr_code` column in `QR Scan Record` to further harden duplicate protection at the database level (as suggested in the migration notes).

## Active Decisions and Considerations
- **Server-Side Locking via Silent DB Writes**: To prevent users from circumventing the duplicate scan lock by clearing their frontend cache, the lock state was moved to a Custom Field (`custom_qr_locked`) on the `User` doctype. Frappe's `frappe.db.set_value(..., update_modified=False)` is used to bypass the ORM and avoid wiping Redis caches during these rapid operations.
- **No DB Patches in v1.3.0**: A deliberate decision was made to omit a migration patch for the new metadata fields. A simple `bench reload-doc "QR Scanner" doctype qr_scan_record` and `bench migrate` is sufficient.
- **Client Metadata Strategy**: Device and user-agent information are harvested automatically on the client and appended to the API request, ensuring that the user doesn't have to fill out these details manually.

## Important Patterns and Preferences
- Pre-commit hooks (`.pre-commit-config.yaml`) are used.
- Code should be strictly formatted via `ruff` with line-length 110, double quotes, and tab indentation as per `pyproject.toml`.
- Avoid standard Frappe JS dialogs/toasts for the scanning interface; rely completely on the custom Vue 3 overlays.
