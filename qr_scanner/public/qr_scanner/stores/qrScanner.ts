/* global frappe */
declare const frappe: any;

import { defineStore } from 'pinia';
import { reactive } from 'vue';
import { beep as hwBeep, vibrate as hwVibrate } from '../haptics';
import { collectClientMeta, ensureBackgroundModel } from '../composables/useDeviceMeta';

type Mode = 'none' | 'loading' | 'success' | 'warning';

export const useQrScannerStore = defineStore('qrScanner', () => {
  // --- CFG (server override) ---
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
    mode: 'none' as Mode,
    successName: null as string | null,
    warnMsg: 'Code must be exactly 33 characters. Please rescan.',
    lockDesc: 'Duplicate barcode detected. Enter admin password to continue.',
    lockError: null as string | null,
    lockBusy: false,
  });

  // --- Internal ---
  let lastCode = '';
  let lastTime = 0;
  let cooldownEndsAt = 0;
  let toSuccessTimer: any = null;
  let successHideTimer: any = null;
  let unlockWatchdog: any = null;
  let cachedModel: string | null = null;

  // --- Helpers ---
  function hBeep(freq = 880, ms = 110) { if (CFG.beep_enabled) try { hwBeep(freq, ms); } catch {} }
  function hVibrate(ms = 60) { if (CFG.vibrate_enabled) try { hwVibrate(ms); } catch {} }
  function now() { return Date.now(); }

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
  function scheduleWarningAfterCooldown(msg?: string, onDone?: () => void) {
  const remaining = Math.max(0, cooldownEndsAt - now());
  if (toSuccessTimer) clearTimeout(toSuccessTimer);
  toSuccessTimer = setTimeout(() => {
    state.warnMsg = msg || 'Code must be exactly 33 characters. Please rescan.';
    state.mode = 'warning';
    const dur = Number(CFG.success_toast_ms || 1500);
    if (successHideTimer) clearTimeout(successHideTimer);
    successHideTimer = setTimeout(() => {
      state.mode = 'none';
      state.inFlight = false;
      onDone?.();
    }, dur);
  }, remaining);
  }
  function scheduleSuccess(name?: string | null, onDone?: () => void) {
    const remaining = Math.max(0, cooldownEndsAt - now());
    if (toSuccessTimer) clearTimeout(toSuccessTimer);
    toSuccessTimer = setTimeout(() => {
      state.successName = name || null;
      state.mode = 'success';
      const successMs = Number(CFG.success_toast_ms || 1500);
      if (successHideTimer) clearTimeout(successHideTimer);
      successHideTimer = setTimeout(() => {
        state.mode = 'none';
        state.inFlight = false;
        onDone?.();
      }, successMs);
    }, remaining);
  }
  // --- Lock ---
  function engageLock(reason?: 'duplicate' | string) {
    abortToIdle();
    state.isLocked = true;
    state.lockError = null;
    state.lockDesc = reason === 'duplicate'
      ? 'Duplicate detected. Enter admin password to continue.'
      : 'Enter admin password to continue.';
    try { localStorage.setItem('qr_lock', reason || 'duplicate'); } catch {}
  }
  function releaseLock() {
    state.isLocked = false;
    state.lockBusy = false;
    state.lockError = null;
    try { localStorage.removeItem('qr_lock'); } catch {}
    lastCode = ''; lastTime = 0; state.inFlight = false; state.mode = 'none';
  }
  function showLockError(msg?: string) { state.lockError = msg || 'Error'; }

  // --- Public Actions ---
  async function init() {
    // settings
    try {
      const r = await frappe.call({ method: 'qr_scanner.api.get_client_settings' });
      if (r?.message) Object.assign(CFG, r.message);
    } catch {}

    // lock restore
    try { const ls = localStorage.getItem('qr_lock'); if (ls) state.isLocked = true; } catch {}

    // device model cache
    try {
      const saved = localStorage.getItem('qr_device_model_he');
      if (saved) cachedModel = saved;
    } catch {}
    ensureBackgroundModel().then(m => { if (m) cachedModel = m; }).catch(() => {});
  }

  function canSubmit() { return !state.isLocked && !state.inFlight; }

  async function submitCode(raw: string, afterIdleFocus?: () => void) {
    if (!canSubmit()) return;

    const trimmed = (raw ?? '').trim();
    const t = now();
    if (trimmed === lastCode && (t - lastTime) < (CFG.debounce_ms || 800)) return;
    lastCode = trimmed; lastTime = t;

    if (trimmed.length !== 33) {
      startCooldown(CFG.ui_cooldown_ms);
      hBeep(300, 140); hVibrate(90);
      scheduleWarningAfterCooldown('Code must be exactly 33 characters. Please rescan.',afterIdleFocus);
      return;
    }

    startCooldown(CFG.ui_cooldown_ms);

    const req = frappe.call({
      method: 'qr_scanner.api.create_scan',
      args: {
        qr_code: trimmed,
        scanned_via: 'USB Scanner',
        client_meta: collectClientMeta(cachedModel),
      }
    });

    req.then((r: any) => {
      const m = r?.message || {};
      if (m.created) {
        hBeep(900, 110); hVibrate(40);
        scheduleSuccess(m.name, afterIdleFocus);
      } else if (m.reason === 'invalid_length') {
        startCooldown(CFG.ui_cooldown_ms);
        hBeep(300, 140); hVibrate(90);
        scheduleWarningAfterCooldown('Code must be exactly 33 characters. Please rescan.', afterIdleFocus);
      } else if (m.reason === 'duplicate') {
        if (CFG.lock_on_duplicate) engageLock('duplicate');
        else { frappe.show_alert({ message: 'Duplicate: already scanned.', indicator: 'red' }); abortToIdle(); afterIdleFocus?.(); }
        hBeep(220, 160); hVibrate(90);
      } else {
        const serverMsg =
          m.msg ||
          (r && r._server_messages && (() => { try { return JSON.parse(r._server_messages).join(' '); } catch { return null; } })()) ||
          'Operation failed.';
        frappe.show_alert({ message: serverMsg, indicator: 'red' });
        abortToIdle(); afterIdleFocus?.();
        hBeep(220, 160); hVibrate(90);
      }
    }).catch(() => {
      frappe.show_alert({ message: 'Server unreachable.', indicator: 'red' });
      abortToIdle(); afterIdleFocus?.();
      hBeep(220, 160); hVibrate(90);
    });
  }

  function unlock(password: string, afterReleaseFocus?: () => void) {
    if (!password || state.lockBusy) return;
    state.lockBusy = true;

    if (unlockWatchdog) clearTimeout(unlockWatchdog);
    unlockWatchdog = setTimeout(() => { state.lockBusy = false; }, 10000);

    const req = frappe.call({ method: 'qr_scanner.api.verify_unlock_password', args: { password } });
    req.then((r: any) => {
      const m = r?.message || {};
      if (m.ok) {
        releaseLock();
        afterReleaseFocus?.();
        hBeep(880, 110); hVibrate(40);
      } else {
        showLockError(m.reason === 'not_configured'
          ? 'Password not configured. Please contact your administrator.'
          : 'Invalid password.');
        hBeep(220, 160); hVibrate(90);
      }
    },
    (_err: any) => {
        showLockError('Server unreachable.');
        hBeep(220, 160); hVibrate(90);
      }
    ).then(() => {
      state.lockBusy = false;
      if (unlockWatchdog) { clearTimeout(unlockWatchdog); unlockWatchdog = null; }
    });
  }

  function dispose() { clearTimers(); }

  return {
    CFG, state,
    init, dispose,
    submitCode, unlock,
    engageLock, releaseLock, showLockError,
  };
});