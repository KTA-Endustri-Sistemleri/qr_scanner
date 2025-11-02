// public/qr_scanner/composables/useDeviceMeta.ts
export function getOrCreateDeviceUUID() {
  const KEY = 'qr_scanner_device_uuid';
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch { return null; }
}

export function deriveDeviceModelFromUA() {
  const ua = navigator.userAgent || '';
  let os = /Windows NT/i.test(ua) ? 'Windows'
        : /Mac OS X/i.test(ua)    ? 'macOS'
        : /Android/i.test(ua)     ? 'Android'
        : /iPhone|iPad|iOS/i.test(ua) ? 'iOS'
        : /Linux/i.test(ua)       ? 'Linux'
        : 'Other';
  if (os === 'Android') {
    const m = ua.match(/Android [^;]*;?\s*([^;)]*?)\s+Build\//i);
    if (m && m[1]) return `Android ${m[1].trim()}`;
  }
  if (os === 'iOS') {
    if (/iPad/i.test(ua)) return 'iPad';
    if (/iPhone/i.test(ua)) return 'iPhone';
    return 'iOS Device';
  }
  const br = /Edg\//.test(ua) ? 'Edge'
          : /Chrome\//.test(ua) && !/Chromium/.test(ua) ? 'Chrome'
          : /Safari\//.test(ua) && !/Chrome\//.test(ua) ? 'Safari'
          : /Firefox\//.test(ua) ? 'Firefox' : 'Browser';
  return `${os} ${br}`;
}

export async function getHighEntropyModelIfAny(): Promise<string | null> {
  try {
    const ua: any = (navigator as any).userAgentData;
    if (ua && ua.getHighEntropyValues) {
      const res = await ua.getHighEntropyValues(['platform', 'model']);
      if (res && res.model) return res.model;
    }
  } catch {/* noop */}
  return null;
}

export function getOrCreateDeviceLabel() {
  const KEY = 'qr_device_label';
  try {
    let label = localStorage.getItem(KEY);
    if (label) return label;
    const model = deriveDeviceModelFromUA() || 'Device';
    const short = (getOrCreateDeviceUUID() || 'xxxxxxxx').slice(0, 8);
    label = `${model.replace(/\s+/g, '-')}-${short}`;
    localStorage.setItem(KEY, label);
    return label;
  } catch { return null; }
}

export function collectClientMeta(cachedModel?: string | null) {
  const nav: any = window.navigator || {};
  const scr: any = window.screen || {};
  return {
    input_method: 'USB Scanner',
    device_uuid: getOrCreateDeviceUUID(),
    device_label: getOrCreateDeviceLabel(),
    device_vendor: nav.vendor || null,
    device_model: cachedModel || deriveDeviceModelFromUA(),
    client_platform: nav.platform || null,
    client_lang: nav.language || null,
    client_hw_threads: (typeof nav.hardwareConcurrency === 'number') ? nav.hardwareConcurrency : null,
    client_screen: (scr && scr.width && scr.height) ? (scr.width + 'x' + scr.height) : null,
    client_user_agent: nav.userAgent || null
  };
}

export async function ensureBackgroundModel(): Promise<string | null> {
  let cached: string | null = null;
  try {
    const saved = localStorage.getItem('qr_device_model_he');
    if (saved) cached = saved;
  } catch {}
  try {
    const ua: any = (navigator as any).userAgentData;
    if (ua?.getHighEntropyValues) {
      const res = await ua.getHighEntropyValues(['platform', 'model']);
      if (res?.model) {
        cached = res.model;
        try { localStorage.setItem('qr_device_model_he', res.model); } catch {}
      }
    }
  } catch {}
  return cached;
}
