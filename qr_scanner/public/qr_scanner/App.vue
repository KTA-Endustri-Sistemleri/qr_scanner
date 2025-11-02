<script setup lang="ts">
import { onMounted, onBeforeUnmount, reactive, ref } from 'vue';
import { getClientSettings, createScan, verifyUnlockPassword } from './api';
import { beep, vibrate } from './haptics';
import type { ClientSettings } from './types';

// ===== Props (wrapper, Page context için hazır) =====
type Props = { wrapper?: any };
const props = defineProps<Props>();

// ===== State (ESKİ JS'teki this.* alanlarıyla bire bir) =====
const DEBUG = (window as any).QR_DEBUG === true;
const ui = reactive({
  status: 'Idle',
  overlay: { mode: 'hidden' as 'hidden'|'loading'|'success'|'warning', text: '' },
  locked: false,
  inFlight: false,
});
const settings = reactive<ClientSettings>({
  success_toast_ms: 900,
  duplicate_sticky: false,     // ESKİ DAVRANIŞ: true → overlay otomatik kapanmaz
  beep_enabled: true,
  vibrate_enabled: true,
  debounce_ms: 60,
  autofocus_back: true,
});
const last = reactive({ code: '', ts: 0 });
const cooldownEndsAt = ref(0);

// Manual input
const manualInput = ref<HTMLInputElement | null>(null);

// ===== Util (ESKİ JS ile aynı davranış) =====
function withinCooldown() { return Date.now() < cooldownEndsAt.value; }
function setStatus(text: string) { ui.status = text; }
function setOverlay(mode: 'hidden'|'loading'|'success'|'warning', text = '') {
  ui.overlay.mode = mode; ui.overlay.text = text;
}
function hBeep(freq = 660, ms = 120) { if (settings.beep_enabled) beep(freq, ms); }
function hVibrate(ms = 60) { if (settings.vibrate_enabled) vibrate(ms); }
function focusManualSoon() { setTimeout(() => manualInput.value?.focus(), 30); }

// ESKİ JS: Sunucu mesaj çözümleme (_server_messages desteği)
function parseServerMessage(resp: any): string | null {
  try {
    const s = resp?._server_messages;
    if (!s) return null;
    const arr = JSON.parse(s);
    if (Array.isArray(arr)) return arr.join(' ');
  } catch {}
  return null;
}

// ===== Client Meta (ESKİ JS'teki toplama mantığını aynen uygular) =====
function collectClientMeta() {
  // Eski js’te toplanan tipik alanlar:
  // userAgent, language, hardwareConcurrency, screen size/dpr, platform, vendor.
  // ESKİ DAVRANIŞ: değer yoksa undefined bırak (sunucu varsayılanları kullanır).
  const nav: any = navigator || {};
  const scr: any = (typeof screen !== 'undefined' ? screen : {}) || {};

  const meta = {
    input_method: undefined as 'manual'|'usb_scanner'|undefined, // çağrı sırasında set edilecek
    device_uuid: undefined as string|undefined,
    device_label: undefined as string|undefined,
    device_vendor: undefined as string|undefined,
    device_model: undefined as string|undefined,
    client_platform: (nav.platform || undefined),
    client_lang: (nav.language || nav.userLanguage || undefined),
    client_hw_threads: (typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : undefined),
    client_screen: (scr && (scr.width && scr.height)
      ? `${scr.width}x${scr.height}@${(window.devicePixelRatio || 1)}`
      : undefined),
    client_user_agent: (nav.userAgent || undefined),
  };
  return meta;
}

// ===== Scan flow (ESKİ JS ile bire bir) =====
async function onScan(code: string, input_method: 'manual'|'usb_scanner' = 'manual') {
  if (ui.locked || ui.inFlight || withinCooldown()) return;

  const now = Date.now();
  // ESKİ DAVRANIŞ: duplicate guard = 600ms
  if (code === last.code && now - last.ts < 600) {
    hBeep(220, 160); hVibrate(90);
    return;
  }

  ui.inFlight = true;
  last.code = code; last.ts = now;

  setStatus('Reading…');
  setOverlay('loading', 'Reading…');

  // ESKİ DAVRANIŞ: client meta her çağrıda toplanır ve create_scan'e gönderilir
  const meta = collectClientMeta();
  meta.input_method = input_method;

  try {
    const r = await createScan(code, meta);
    const serverMsg = r?.msg || parseServerMessage(r) || null;

    if (r?.ok && r.created) {
      // SUCCESS (ESKİ DAVRANIŞ):
      setStatus('Saved');
      setOverlay('success', serverMsg || 'Saved');
      hBeep(880, 90); hVibrate(40);
      cooldownEndsAt.value = Date.now() + 300; // küçük post-success guard

      // success overlay auto-hide: ESKİ DAVRANIŞ (success_toast_ms’le uyumlu)
      if (!settings.duplicate_sticky) {
        setTimeout(() => setOverlay('hidden', ''), settings.success_toast_ms ?? 900);
      }
      ui.inFlight = false;
      return;
    }

    if (r?.reason === 'duplicate') {
      // DUPLICATE (ESKİ DAVRANIŞ):
      setStatus('Duplicate');
      setOverlay('warning', serverMsg || 'Duplicate / Locked');
      hBeep(220, 160); hVibrate(90);
      ui.inFlight = false;

      // ESKİ DAVRANIŞ: duplicate_sticky === true ise overlay KAPANMAZ
      if (!settings.duplicate_sticky) {
        setTimeout(() => setOverlay('hidden', ''), settings.success_toast_ms ?? 900);
      }
      return;
    }

    // OTHER ERRORS (ESKİ DAVRANIŞ):
    const fallback = serverMsg || r?.msg || 'Operation failed.';
    frappe.show_alert({ message: fallback, indicator: 'red' });
    setStatus('Error');
    setOverlay('warning', fallback);
    hBeep(220, 160); hVibrate(90);
  } catch (err: any) {
    // NETWORK / SERVER DOWN (ESKİ DAVRANIŞ)
    frappe.show_alert({ message: 'Server unreachable.', indicator: 'red' });
    setStatus('Error');
    setOverlay('warning', 'Server unreachable.');
    hBeep(220, 160); hVibrate(90);
  } finally {
    ui.inFlight = false;
  }
}

// ===== Manual input (ESKİ DAVRANIŞ) =====
function onManualKey(e: KeyboardEvent) {
  if (e.key !== 'Enter') return;
  const code = (manualInput.value?.value || '').trim();
  if (!code) return;
  onScan(code, 'manual');
  if (manualInput.value) manualInput.value.value = '';
}

// ===== USB scanner burst typing (ESKİ DAVRANIŞ) =====
let burst = '';
let burstTimer: any = null;

function onKeydown(e: KeyboardEvent) {
  // ESKİ DAVRANIŞ: input içinde yazarken (bizim manual input hariç) yakalama
  const target = e.target as HTMLElement | null;
  if (target && target.tagName === 'INPUT' && target !== manualInput.value) return;

  if (e.ctrlKey || e.altKey || e.metaKey) return; // modifier’lar devre dışı

  const ch = e.key.length === 1 ? e.key : (e.key === 'Enter' ? '\n' : '');
  if (!ch) return;

  burst += ch;
  clearTimeout(burstTimer);
  burstTimer = setTimeout(() => {
    const code = burst.replace(/\n/g, '').trim();
    if (code) onScan(code, 'usb_scanner');
    burst = '';
  }, settings.debounce_ms || 60);

  if (e.key === 'Enter') {
    const code = burst.replace(/\n/g, '').trim();
    burst = '';
    if (code) onScan(code, 'usb_scanner');
  }
}

// ===== Lock / Unlock (ESKİ DAVRANIŞ) =====
async function tryUnlock() {
  const pw = prompt('Unlock password');
  if (!pw) return;
  const ok = await verifyUnlockPassword(pw);
  if (ok) {
    ui.locked = false; setStatus('Idle'); setOverlay('hidden', '');
  } else {
    setOverlay('warning', 'Wrong password'); hBeep(220, 200); hVibrate(120);
  }
}

// ===== Lifecycle =====
onMounted(async () => {
  try {
    // ESKİ DAVRANIŞ: get_client_settings ile UI ayarlarını al
    Object.assign(settings, await getClientSettings());
  } catch {
    // sunucu defaultları kullanılacak
  }

  window.addEventListener('keydown', onKeydown);
  focusManualSoon();
  if (DEBUG) console.log('[QR] Vue ready.');
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
});
</script>

<template>
  <div class="qr-root">
    <!-- Header / Status -->
    <div class="qr-status">
      <div class="qr-title">QR Scanner</div>
      <div class="qr-status-text">{{ ui.status }}</div>
      <div class="qr-actions">
        <button class="qr-btn" @click="ui.locked = true; setOverlay('warning','Locked')">Lock</button>
        <button class="qr-btn" @click="tryUnlock" :disabled="!ui.locked">Unlock</button>
      </div>
    </div>

    <!-- Manual Input -->
    <div class="qr-manual">
      <input ref="manualInput"
             class="qr-input"
             type="text"
             placeholder="Scan or type and press Enter"
             @keydown="onManualKey" />
    </div>

    <!-- Overlay -->
    <div class="qr-overlay"
         :class="ui.overlay.mode !== 'hidden' ? ui.overlay.mode : 'qr-overlay--hidden'">
      <span>{{ ui.overlay.text }}</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.qr-root { position: relative; width: 100%; max-width: 960px; margin: 16px auto; padding: 0 12px; }
.qr-status { display: grid; grid-template-columns: 1fr auto auto; gap: 12px; align-items: center; padding: 12px 0; }
.qr-title { font-weight: 700; font-size: 1.05rem; }
.qr-status-text { color: var(--qr-status-color, #0f172a); }
.qr-actions { display: flex; gap: 8px; }
.qr-btn { padding: 6px 10px; border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 8px; cursor: pointer; }
.qr-btn:disabled { opacity: .5; cursor: default; }
.qr-manual { margin-top: 12px; }
.qr-input { width: 100%; padding: 10px; font-size: 16px; border: 1px solid #cbd5e1; border-radius: 8px; }

.qr-overlay { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
  font-weight: 600; font-size: 18px; opacity: 0; pointer-events: none; transition: opacity .18s; }
.qr-overlay--hidden { opacity: 0; }
.qr-overlay.loading { background: #1e40af; color: #fff; opacity: .92; }
.qr-overlay.success { background: #166534; color: #fff; opacity: .92; }
.qr-overlay.warning { background: #92400e; color: #fff; opacity: .92; }
</style>