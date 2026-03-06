# Project Brief

## Project Overview
**QR Scanner** is a custom Frappe/ERPNext application (specifically designed for v15.81.1) developed by Ufuk Karamalli for KTA Endüstri Sistemleri. Its primary purpose is to scan QR labels using a USB keyboard-wedge barcode scanner (or manual input) and record these scans predictably and securely within ERPNext.

## Core Requirements & Goals
- **Reliable Scanning**: Capture QR codes securely and store them as `QR Scan Record` entries in the Frappe database.
- **Validation**: Enforce strict length validation (exactly 33 characters for the QR code).
- **Duplicate Prevention mechanism**: Reject duplicate scans. When a duplicate is detected, lock the UI with a fullscreen red lock screen that requires an admin password to continue operations. The lock is strictly enforced via a server-side DB flag to prevent operator tampering or bypasses via cache-purging.
- **Responsive Feedback**: Provide immediate, unambiguous visual feedback to the user through state-driven UI overlays (Loading, Success, Warning) instead of easily-missed floating toasts.
- **Device Telemetry**: Silently collect client and device metadata (e.g., UUID, platform, OS) on every scan for auditing and traceability.

## Source of Truth
This project relies on the Frappe framework architecture for backend models (DocTypes like `QR Scan Record` and `QR Scan Settings`) and APIs, while the frontend is a standalone Vue 3 + TypeScript SPA embedded directly into a Frappe Page. 

## Current Status
The project features a rebuilt Vue 3 + Pinia frontend that solidifies state-machine-driven UI transitions and enhances the user experience, whilst security patches have locked down duplicate-scan circumventions via strict backend database tracking.
