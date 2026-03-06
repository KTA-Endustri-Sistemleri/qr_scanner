# Product Context

## Purpose
The QR Scanner app exists to facilitate rapid, error-free data entry of QR codes on the shop floor, warehouse, or any operational environment using ERPNext. It replaces manual or generic entry methods with a highly specialized, feedback-heavy interface tailored for physical USB barcode scanners.

## Problems Solved
1. **Accidental Duplicate Scans**: A common issue in rapid scanning environments. The app solves this by strictly validating against existing records and throwing a "Fullscreen Red Lock" that aggressively stops the workflow until an admin intervenes. The lock is tracked server-side in the database, preventing local caching workarounds.
2. **Poor Visibility of Background Tasks**: Generic ERP floating toasts hide easily or stack up. The app uses **in-card opaque overlays** that physically block the input field during processing, success, or warning states.
3. **Invalid Data Entry**: Ensures all QR codes are precisely 33 characters.
4. **Audit and Traceability**: By automatically collecting device metadata (UUID, browser thread count, platform), administrators can track exactly which physical workstation performed a scan.

## How It Works
1. The user navigates to the Frappe Page `https://<site>/app/qr-scanner`.
2. The user focuses the input field (auto-focus is aggressively maintained by the client).
3. The user scans a QR code using a USB wedge scanner (which simulates typing followed by an 'Enter' keystroke).
4. The Vue 3 frontend transitions to a **Loading** state (blue overlay), blocking further input and debouncing rapid scans.
5. An API call handles the backend validation (`qr_scanner.api.create_scan`):
   - Valid -> Returns success. The UI shows a **Success** state (green overlay).
   - Invalid Length -> Returns warning. The UI shows a **Warning** state (amber overlay).
   - Duplicate -> Returns duplicate. The UI transitions to the **Locked** state.

## User Experience Goals
- **Speed & Predictability**: The UI transitions follow a strict state machine (`setIdle`, `setLoading`, `setSuccess`, `setWarning`) ensuring predictable behavior.
- **Zero Distraction**: Fully opaque overlays guarantee the user knows exactly what state the system is in.
- **Friction Where Necessary**: The lock screen intentionally introduces high friction on duplicates to ensure operational compliance.
