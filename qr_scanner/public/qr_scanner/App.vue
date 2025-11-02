<script setup lang="ts">
/* global frappe */
declare const frappe: any;

import { reactive, ref, onMounted, onBeforeUnmount } from 'vue';
import { beep as hwBeep, vibrate as hwVibrate } from './haptics';
import InputRow from './components/InputRow.vue';
import QrOverlays from './components/QrOverlays.vue';
import LockDialog from './components/LockDialog.vue';
import { collectClientMeta, getHighEntropyModelIfAny } from './composables/useDeviceMeta';

// --- CFG (server override edilecek) ---
const CFG = reactive<Record<string, any>>({
  success_toast_ms: 1500,
  beep_enabled: 1,
  vibrate_enabled: 1,
  debounce_ms: 800,
  autofocus_back: 1,
  silence_ms: 120,
  lock_on_duplicate: 1,
  loading_enabled: 1,
  ui_cooldown_ms: 1000,
});

// --- UI State ---
const state = reactive({
  inFlight: false,
  isLocked: false,
  mode: 'none' as 'none' | 'loading' | 'success' | 'warning',
  successName: null as string | null,
  warnMsg: 'Code must be exactly 33 characters. Please rescan.' as string,
  lockDesc: 'Duplicate barcode detected. Enter admin password to continue.',
  lockError: null as string | null,
  lockBusy: false,
});

let lastCode = '';
let lastTime = 0;
let cooldownEndsAt = 0;
let toSuccessTimer: any = null;
let successHideTimer: any = null;
let unlockWatchdog: any = null;

let cachedModel: string | null = null;

// ---- Helpers ----
function hBeep(freq = 880, ms = 110) { if (CFG.beep_enabled) try { hwBeep(freq, ms); } catch {} }
function hVibrate(ms = 60) { if (CFG.vibrate_enabled) try { hwVibrate(ms); } catch {} }
function now() { return Date.now(); }
function focusInput() { inputRef.value?.focusSoon(); }

function clearTimers() {
  if (toSuccessTimer) { clearTimeout(toSuccessTimer); toSuccessTimer = null; }
  if (successHideTimer) { clearTimeout(successHideTimer); successHideTimer = null; }
}
function abortToIdle() {
  clearTimers();
  state.mode = 'none';
  state.inFlight = false;
}
function startCooldown(ms?: number) {
  if (!CFG.loading_enabled) return;
  const dur = Number(ms != null ? ms : (CFG.ui_cooldown_ms || 1000));
  if (dur <= 0) return;
  state.inFlight = true;
  state.mode = 'loading';
  cooldownEndsAt = now() + dur;
}
function scheduleSuccess(name?: string | null) {
  const remaining = Math.max(0, cooldownEndsAt - now());
  if (toSuccessTimer) clearTimeout(toSuccessTimer);
  toSuccessTimer = setTimeout(() => {
    state.successName = name || null;
    state.mode = 'success';
    const successMs = Number(CFG.success_toast_ms || 1500);
    if (successHideTimer) clearTimeout(successHideTimer);
    successHideTimer = setTimeout(() => { state.mode = 'none'; state.inFlight = false; focusInput(); }, successMs);
  }, remaining);
}
function scheduleWarning(msg?: string) {
  state.warnMsg = msg || 'Code must be exactly 33 characters. Please rescan.';
  state.mode = 'warning';
  const dur = Number(CFG.success_toast_ms || 1500);
  if (successHideTimer) clearTimeout(successHideTimer);
  successHideTimer = setTimeout(() => { state.mode = 'none'; state.inFlight = false; focusInput(); }, dur);
}

// ---- Lock ----
function engageLock(reason?: 'duplicate' | string) {
  abortToIdle();
  state.isLocked = true;
  state.lockError = null;
  state.lockDesc = reason === 'duplicate'
    ? 'Duplicate detected. Enter admin password to continue.'
    : 'Enter admin password to continue.';
  setTimeout(() => lockRef.value?.inputEl?.focus(), 50);
  try { localStorage.setItem('qr_lock', reason || 'duplicate'); } catch {}
}
function releaseLock() {
  state.isLocked = false;
  state.lockBusy = false;
  state.lockError = null;
  try { localStorage.removeItem('qr_lock'); } catch {}
  lastCode = ''; lastTime = 0; state.inFlight = false; state.mode = 'none';
  focusInput();
}
function showLockError(msg?: string) { state.lockError = msg || 'Error'; }

// ---- Flow ----
function onEnter(code: string) {
  if (state.isLocked || state.inFlight) return;

  const t = now();
  if (code === lastCode && (t - lastTime) < (CFG.debounce_ms || 800)) return;
  lastCode = code; lastTime = t;

  if ((code || '').length !== 33) {
    hBeep(300, 140); hVibrate(90);
    scheduleWarning('Code must be exactly 33 characters. Please rescan.');
    return;
  }

  startCooldown(CFG.ui_cooldown_ms);

  const req = frappe.call({
    method: 'qr_scanner.api.create_scan',
    args: {
      qr_code: code,
      scanned_via: 'USB Scanner',
      client_meta: collectClientMeta(cachedModel),
    }
  });

  req.then((r: any) => {
    const m = r?.message || {};
    if (m.created) {
      hBeep(900, 110); hVibrate(40);
      scheduleSuccess(m.name);
    } else if (m.reason === 'invalid_length') {
      hBeep(300, 140); hVibrate(90);
      scheduleWarning('Code must be exactly 33 characters. Please rescan.');
    } else if (m.reason === 'duplicate') {
      if (CFG.lock_on_duplicate) engageLock('duplicate');
      else { frappe.show_alert({ message: 'Duplicate: already scanned.', indicator: 'red' }); abortToIdle(); }
      hBeep(220, 160); hVibrate(90);
    } else {
      const serverMsg =
        m.msg ||
        (r && r._server_messages && (() => { try { return JSON.parse(r._server_messages).join(' '); } catch { return null; } })()) ||
        'Operation failed.';
      frappe.show_alert({ message: serverMsg, indicator: 'red' });
      abortToIdle();
      hBeep(220, 160); hVibrate(90);
    }
  }).catch(() => {
    frappe.show_alert({ message: 'Server unreachable.', indicator: 'red' });
    abortToIdle();
    hBeep(220, 160); hVibrate(90);
  });
}

function onUnlockSubmit(pw: string) {
  if (!pw || state.lockBusy) return;
  state.lockBusy = true;

  // 10s watchdog
  if (unlockWatchdog) clearTimeout(unlockWatchdog);
  unlockWatchdog = setTimeout(() => {
    state.lockBusy = false;
  }, 10000);

  const req = frappe.call({ method: 'qr_scanner.api.verify_unlock_password', args: { password: pw } });
  req.then((r: any) => {
    const m = r?.message || {};
    if (m.ok) {
      releaseLock();
      hBeep(880, 110); hVibrate(40);
    } else {
      showLockError(m.reason === 'not_configured'
        ? 'Password not configured. Please contact your administrator.' : 'Invalid password.');
      hBeep(220, 160); hVibrate(90);
    }
  }).catch(() => {
    showLockError('Server unreachable.');
    hBeep(220, 160); hVibrate(90);
  }).finally(() => {
    state.lockBusy = false;
    if (unlockWatchdog) { clearTimeout(unlockWatchdog); unlockWatchdog = null; }
  });
}

// ---- Settings + Device identity ----
async function fetchSettings() {
  try {
    const r = await frappe.call({ method: 'qr_scanner.api.get_client_settings' });
    if (r && r.message) Object.assign(CFG, r.message);
  } catch {/* noop */}
}
async function ensureBackgroundDeviceIdentity() {
  cachedModel = null;
  try {
    const saved = localStorage.getItem('qr_device_model_he');
    if (saved) cachedModel = saved;
  } catch {/* noop */}
  getHighEntropyModelIfAny().then(m => {
    if (m) {
      cachedModel = m;
      try { localStorage.setItem('qr_device_model_he', m); } catch {}
    }
  }).catch(() => {});
}

// ---- Refs to children ----
const inputRef = ref<InstanceType<typeof InputRow> | null>(null);
const lockRef  = ref<InstanceType<typeof LockDialog> | null>(null);

// ---- Lifecycle ----
onMounted(async () => {
  await fetchSettings();
  await ensureBackgroundDeviceIdentity();

  // Persisted lock restore
  try { const ls = localStorage.getItem('qr_lock'); if (ls) state.isLocked = true; } catch {}

  // İlk odak
  focusInput();
});
onBeforeUnmount(() => clearTimers());
</script>

<template>
  <div class="qr-container">
    <div id="qrCard" class="card qr-card">
      <div class="qr-section" role="region" aria-live="polite" aria-atomic="true">
        <div class="qr-title">USB / Keyboard Wedge</div>

        <!-- Input Row -->
        <InputRow
          ref="inputRef"
          :disabled="state.inFlight || state.isLocked || state.mode !== 'none'"
          :autofocus="true"
          :autofocusBack="!!CFG.autofocus_back"
          @enter="onEnter"
        />

        <div class="qr-help">
          States are displayed as opaque overlays inside the card. On duplicate, a red lock requires admin password.
        </div>
      </div>

      <!-- Opaque overlays (loading/success/warning) -->
      <QrOverlays
        :mode="state.mode"
        :successName="state.successName"
        :warnMsg="state.warnMsg"
      />
    </div>

    <!-- Fullscreen Lock -->
    <LockDialog
      ref="lockRef"
      :show="state.isLocked"
      :desc="state.lockDesc"
      :error="state.lockError"
      :busy="state.lockBusy"
      @submit="onUnlockSubmit"
    />
  </div>
</template>

<style>
/* Orijinal CSS’in tamamı (App.vue’daki) aynen bırakıldı */
.qr-container { width:100%; max-width:960px; margin:16px auto; padding:0 12px; }
.qr-card { position: relative; }
.qr-section { padding:18px; }
.qr-title { font-weight:700; font-size:1.05rem; margin-bottom:8px; }
.qr-row { display:flex; gap:10px; align-items:center; }
.qr-help { color:#6b7280; margin-top:8px; }
@media (prefers-color-scheme: dark){ .qr-help{ color:#9ca3af; } }

.qr-input{
  flex:1; font-size:1.1rem; padding:12px 14px;
  border-radius:10px; border:1px solid #e5e7eb; background:#fff; color:#0f172a;
}
.qr-input:focus{ outline:none; border-color:#60a5fa; box-shadow:0 0 0 3px rgba(96,165,250,.22); }
@media (prefers-color-scheme: dark){
  .qr-input{ background:#0f172a; color:#e5e7eb; border-color:#243042; }
}

.qr-overlay{
  position:absolute; inset:0; z-index:1; border-radius: inherit;
}
.qr-overlay .qr-overlay-content{
  display:flex; flex-direction:column; justify-content:center; align-items:center;
  text-align:center; width:100%; height:100%; gap:8px; font-weight:600; padding:18px; color:inherit;
}
.qr-overlay.loading{ background:#1e40af; color:#ffffff; }
.qr-overlay.loading .qr-spinner{
  width:18px; height:18px; border:2px solid rgba(255,255,255,.35);
  border-top-color:#ffffff; border-radius:50%; animation:qrs .8s linear infinite;
}
@keyframes qrs{ to{ transform: rotate(360deg) } }

.qr-overlay.success{ background:#166534; color:#ffffff; }
.qr-overlay.success .qr-dot-ok{ width:12px; height:12px; border-radius:50%; background:#ffffff; }

.qr-overlay.warning{ background:#92400e; color:#ffffff; }
.qr-overlay.warning .qr-dot-ok{ width:12px; height:12px; border-radius:50%; background:#ffffff; }

@media (prefers-color-scheme: dark){
  .qr-overlay.loading{ background:#1e3a8a; }
  .qr-overlay.success{ background:#14532d; }
  .qr-overlay.warning{ background:#78350f; }
}

.qr-lock{position:fixed;inset:0;background:#dc3545;z-index:10000;display:none;color:#fff}
.qr-lock.show{display:flex}
.qr-lock-inner{margin:auto;width:min(560px,90vw);background:rgba(0,0,0,.18);border-radius:14px;padding:20px;box-shadow:0 12px 40px rgba(0,0,0,.35);backdrop-filter:blur(2px)}
.qr-lock-title{font-size:1.15rem;font-weight:700;margin-bottom:6px}
.qr-lock-desc{opacity:.9;margin-bottom:14px}
.qr-lock-form{display:flex;gap:8px}
.qr-lock-input{flex:1;padding:12px 14px;border-radius:10px;border:none;outline:none;font-size:1rem}
.qr-lock-btn{padding:12px 16px;border-radius:10px;border:none;cursor:pointer;font-weight:600}
.qr-lock-error{margin-top:10px;font-weight:600;display:block}
</style>