# Tech Context

## Technologies Used
- **Backend Framework**: Frappe Framework (target v15.81.1+)
- **Backend Language**: Python >= 3.10
- **Frontend Framework**: Vue 3 (Composition API)
- **Frontend State Management**: Pinia
- **Frontend Language**: TypeScript, HTML, CSS (Vanilla/Scss based on standard build tools)
- **Database**: MariaDB / PostgreSQL (managed by Frappe)
- **Tooling**: Flit Core (Python Build), Ruff (Linter & Formatter), Pre-commit

## Development Setup
- Installed via `bench get-app qr_scanner <repo>` and `bench install-app qr_scanner`.
- Requires running `bench build` inside the frontend container (or local directory) if modifying the Vue 3 application.
- Uses `pyproject.toml` configuration for Python linting rule definition (e.g., `ruff` select = F, E, W, I, UP, B, RUF, line-length = 110).

## Technical Constraints
- **Performance vs Framework Caches**: Due to the rapid-nature of the scanning app, we cannot freely use Frappe's ORM (like `doc.save()`) to record fleeting lock states for UI control, as that triggers sweeping cache recalculations across Redis. We must instead execute direct DB mutations via `frappe.db.set_value(..., update_modified=False)` which bypasses these bottlenecks.
- The UI must perfectly block inputs during API calls and cooldown (`ui_cooldown_ms`), preventing accidental rapid scanning.
- Must execute on devices as small as 420x720, so responsive CSS rules (like stacked lock inputs) are fundamental to the UX.
- Server-side fallback for `qr_scanner_unlock_password` must be maintained via `site_config.json` if not configured in the Frappe Desk DocType `QR Scan Settings`.

## Dependencies
- Relies on Frappe Framework v15 (`frappe~=15.0.0`) capabilities for DocTypes, Whitelisted APIs, Roles (`System Manager`, `QR Scanner User`, `QR Scanner Manager`), and the Page wrapper.
- Uses `hmac.compare_digest` in Python for safe password comparisons.
