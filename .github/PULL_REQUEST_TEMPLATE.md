## 🚀 Overview

This Pull Request introduces the **Vue 3 + TypeScript + Pinia** architectural migration for the QR Scanner application, alongside significant Database & Security hardening (Server-Side Locking).

### 📝 Summary of Changes

#### 1. Frontend Architectural Overhaul
- **Vue 3 Migration**: Fully removed native Frappe Vanilla JS DOM manipulation. The scanner page is now a bundled modular Vue 3 frontend mapped via Esbuild. 
- **In-Card Opaque Overlays**: Replaced floating Frappe toasts with fully opaque blocking overlays (Loading, Success, Warning) powered by Vue state machines.
- **Responsive Adjustments**: The new Lock Screen gracefully shifts layout vectors on devices `<= 420px` to maintain industrial-grade readability.

#### 2. Security & Duplicate Protections (Server-Side Lock)
- **Database Lock State**: The `LockedState` has been stripped from vulnerable `localStorage` logic and bound directly to the Frappe Backend (`custom_qr_locked` column). Browser cache clears will no longer bypass the duplicate locks.
- **MariaDB UNIQUE Indexes**: Assigned a hard SQL `UNIQUE B-tree` index to the `qr_code` field inside `QR Scan Record`. Duplicate scans firing at the exact millisecond are caught gracefully by `frappe.UniqueValidationError`.

#### 3. Administrative Realtime Tools
- **Locked Users Dashboard**: Created a dedicated Frappe page `/app/qr-scanner-locked-users`.
- **WebSocket Remote Unlocking**: Managers (`QR Scanner Manager`) can monitor blocked operation lines in real-time and issue unlocking override commands via Socket.io (`frappe.publish_realtime`).

#### 4. Stealth Telemetry Context
- The app now silently collects machine thread count, resolution, device vendor/model, OS language, and browser agent string mapping them back to each successful record dynamically through Vue Composables.

---

### 🧪 Checklist / How to Test
- [ ] Ensure `bench migrate` completes successfully to register the newly added `UNIQUE` database index on your instance. 
- [ ] Scan a **33-character** QR token. Confirm the green In-Card success overlay triggers correctly.
- [ ] Attempt a **duplicate scan**. Confirm the Fullscreen Red Lock appears.
- [ ] While locked, attempt to **clear the browser cache and refresh** the page (F5). Ensure the screen remains securely locked due to the Server-Side boolean.
- [ ] Log in as an administrator on another tab, visit `/app/qr-scanner-locked-users`, and verify the **"Unlock" Button** instantaneously releases the lockdown natively on the scanning machine via websockets. 

---

> _Documentation Note: Relevant system architecture and memory bank artifacts (`CHANGELOG.md`, `README.md`) have been successfully bumped to `v1.3.1` corresponding to this deployment._
