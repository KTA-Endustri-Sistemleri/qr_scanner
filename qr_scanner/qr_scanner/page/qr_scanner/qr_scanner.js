// --- QR Scanner – Class-based; background device label & model detection (no UI fields) ---
(() => {
  class QRScannerPage {
    constructor(wrapper) {
      this.wrapper = wrapper;

      // ----- State -----
      this.DEBUG = window.QR_DEBUG === true;
      this.isLocked = false;
      this.inFlight = false;
      this.lastCode = '';
      this.lastTime = 0;
      this.cooldownEndsAt = 0;
      this.toSuccessTimer = null;
      this.successHideTimer = null;

      // Cached model/label
      this.cachedModel = null;

      // Defaults (server overrides via get_client_settings)
      this.CFG = {
        success_toast_ms: 1500, // success overlay visibility
        beep_enabled: 1,
        vibrate_enabled: 1,
        debounce_ms: 800,
        autofocus_back: 1,
        silence_ms: 120,
        lock_on_duplicate: 1,
        loading_enabled: 1,
        ui_cooldown_ms: 1000
      };

      // Build UI, bind events, fetch settings
      this.render();
      this.cacheDom();
      this.bindEvents();
      this.fetchSettings();

      // Prepare device model/label in background
      this.ensureBackgroundDeviceIdentity();

      this.setIdle();
    }

    // ---------- Render ----------
    render() {
      const page = frappe.ui.make_app_page({
        parent: this.wrapper,
        title: 'QR Scanner',
        single_column: true
      });

      $(page.body).html(`
        <style>
          .qr-container { width:100%; max-width:960px; margin:16px auto; padding:0 12px; }
          .qr-card { position: relative; } /* overlays need positioning */
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

          /* O P A Q U E overlays (card içini tamamen kaplar) */
          .qr-overlay{
            position:absolute; inset:0; z-index:1;
            border-radius: inherit; display:none;
            pointer-events: all; /* alttaki input'a tıklanmasın */
          }
          .qr-overlay .qr-overlay-content{
            display:flex; flex-direction:column; justify-content:center; align-items:center;
            text-align:center; width:100%; height:100%; gap:8px; font-weight:600; padding:18px; color:inherit;
          }
          .qr-overlay.loading{ background:#1e40af; color:#ffffff; }  /* blue-800 */
          .qr-overlay.loading .qr-spinner{
            width:18px; height:18px; border:2px solid rgba(255,255,255,.35);
            border-top-color:#ffffff; border-radius:50%; animation:qrs .8s linear infinite;
          }
          @keyframes qrs{ to{ transform: rotate(360deg) } }

          .qr-overlay.success{ background:#166534; color:#ffffff; }  /* green-800 */
          .qr-overlay.success .qr-dot-ok{ width:12px; height:12px; border-radius:50%; background:#ffffff; }

          @media (prefers-color-scheme: dark){
            .qr-overlay.loading{ background:#1e3a8a; }
            .qr-overlay.success{ background:#14532d; }
          }

          /* Fullscreen Lock */
          .qr-lock{position:fixed;inset:0;background:#dc3545;z-index:10000;display:none;color:#fff}
          .qr-lock.show{display:flex}
          .qr-lock-inner{margin:auto;width:min(560px,90vw);background:rgba(0,0,0,.18);border-radius:14px;padding:20px;box-shadow:0 12px 40px rgba(0,0,0,.35);backdrop-filter:blur(2px)}
          .qr-lock-title{font-size:1.15rem;font-weight:700;margin-bottom:6px}
          .qr-lock-desc{opacity:.9;margin-bottom:14px}
          .qr-lock-form{display:flex;gap:8px}
          .qr-lock-input{flex:1;padding:12px 14px;border-radius:10px;border:none;outline:none;font-size:1rem}
          .qr-lock-btn{padding:12px 16px;border-radius:10px;border:none;cursor:pointer;font-weight:600}
          .qr-lock-error{margin-top:10px;font-weight:600;display:none}
        </style>

        <div class="qr-container">
          <div id="qrCard" class="card qr-card">
            <div class="qr-section" role="region" aria-live="polite" aria-atomic="true">
              <div class="qr-title">USB / Keyboard Wedge</div>
              <div class="qr-row">
                <input id="manual" type="text" class="form-control qr-input"
                       placeholder="Scan with USB scanner or type and press Enter" autofocus />
              </div>
              <div class="qr-help">States are displayed as opaque overlays inside the card. On duplicate, a red lock requires admin password.</div>
            </div>

            <!-- OPAQUE LOADING -->
            <div id="overlayLoading" class="qr-overlay loading" aria-hidden="true">
              <div class="qr-overlay-content" aria-live="polite">
                <div class="qr-spinner" aria-hidden="true"></div>
                <div>Processing…</div>
                <div class="qr-help" style="color:#fff;opacity:.9">Submitting record, please wait.</div>
              </div>
            </div>

            <!-- OPAQUE SUCCESS -->
            <div id="overlaySuccess" class="qr-overlay success" aria-hidden="true">
              <div class="qr-overlay-content" aria-live="polite">
                <div class="qr-dot-ok" aria-hidden="true"></div>
                <div>Saved</div>
                <div id="successDesc" class="qr-help" style="color:#fff;opacity:.9">Done.</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Fullscreen Lock -->
        <div id="qrLock" class="qr-lock" role="dialog" aria-modal="true" aria-labelledby="qrLockTitle">
          <div class="qr-lock-inner">
            <div id="qrLockTitle" class="qr-lock-title">Access Locked</div>
            <div id="qrLockDesc"  class="qr-lock-desc">Duplicate barcode detected. Enter admin password to continue.</div>
            <form id="qrLockForm" class="qr-lock-form" autocomplete="off">
              <input type="text" tabindex="-1" aria-hidden="true" style="position:absolute;left:-9999px;top:-9999px" />
              <input id="qrLockInput" class="qr-lock-input" type="password" placeholder="Admin password"
                     name="unlock_pwd" autocomplete="new-password" autocapitalize="off" autocorrect="off" spellcheck="false" inputmode="text" />
              <button id="qrLockBtn" class="qr-lock-btn" type="submit">Unlock</button>
            </form>
            <div id="qrLockError" class="qr-lock-error">Invalid password.</div>
          </div>
        </div>
      `);
    }

    // ---------- Cache DOM ----------
    cacheDom() {
      this.$manual = document.getElementById('manual');
      this.$overlayLoading = document.getElementById('overlayLoading');
      this.$overlaySuccess = document.getElementById('overlaySuccess');
      this.$successDesc = document.getElementById('successDesc');
      this.$lock = document.getElementById('qrLock');
      this.$lockDesc = document.getElementById('qrLockDesc');
      this.$lockError = document.getElementById('qrLockError');
      this.$lockInput = document.getElementById('qrLockInput');
      this.$lockBtn = document.getElementById('qrLockBtn');
      this.$lockForm = document.getElementById('qrLockForm');
    }

    // ---------- Events ----------
    bindEvents() {
      // Enter ile gönder
      this.$manual.addEventListener('keydown', (e) => {
        if (this.isLocked || this.inFlight) { e.preventDefault(); return; }
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = (this.$manual.value || '').trim();
          this.$manual.value = '';
          if (val) this.onScanned(val);
        }
      });

      // Odak kaybı → geri odakla (ayar bağlı)
      this.$manual.addEventListener('blur', () => {
        if (this.CFG.autofocus_back && !this.isLocked && !this.inFlight) {
          setTimeout(() => this.$manual.focus(), 50);
        }
      });

      // Lock form submit
      this.$lockForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const pw = (this.$lockInput.value || '').trim();
        if (!pw) { this.showLockError('Password cannot be empty.'); return; }
        this.$lockBtn.setAttribute('disabled', 'disabled');
        const req = frappe.call({ method: 'qr_scanner.api.verify_unlock_password', args: { password: pw } });
        req.then((r) => {
          const m = r.message || {};
          if (m.ok) {
            this.$lockInput.value = '';
            this.releaseLock();
            this.beep(880, 110); this.vibrate(40);
          } else {
            this.showLockError(m.reason === 'not_configured'
              ? 'Password not configured. Please contact your administrator.' : 'Invalid password.');
            this.$lockInput.value = '';
            this.beep(220, 160); this.vibrate(90);
          }
        }).catch(() => {
          this.showLockError('Server unreachable.');
          this.$lockInput.value = '';
          this.beep(220, 160); this.vibrate(90);
        }).finally(() => this.$lockBtn.removeAttribute('disabled'));
      });

      // İlk açılışta devam eden kilit varsa sürdür
      try {
        const ls = localStorage.getItem('qr_lock');
        if (ls) this.engageLock(ls);
      } catch (_) {}
      (this.$lockInput || {}).addEventListener?.('focus', () => { this.$lockInput.value = ''; }, { once: true });
    }

    // ---------- Settings ----------
    fetchSettings() {
      frappe.call({ method: 'qr_scanner.api.get_client_settings' })
        .then(r => { if (r && r.message) Object.assign(this.CFG, r.message); })
        .catch(() => {});
    }

    // ---------- Overlays ----------
    showOverlay(el) {
      if (this.$overlayLoading) this.$overlayLoading.style.display = (el === this.$overlayLoading) ? 'block' : 'none';
      if (this.$overlaySuccess) this.$overlaySuccess.style.display = (el === this.$overlaySuccess) ? 'block' : 'none';
    }
    setIdle() {
      this.showOverlay(null);
      if (this.$manual) this.$manual.removeAttribute('disabled');
      this.focusInput();
    }
    setLoading() {
      this.showOverlay(this.$overlayLoading);
      if (this.$manual) this.$manual.setAttribute('disabled', 'disabled');
    }
    setSuccess(name) {
      if (this.$successDesc) this.$successDesc.textContent = name ? ('Document: ' + name) : 'Done.';
      this.showOverlay(this.$overlaySuccess);
      if (this.$manual) this.$manual.setAttribute('disabled', 'disabled');
    }

    // ---------- Flow Timers ----------
    startCooldown(ms) {
      if (!this.CFG.loading_enabled) return;
      const dur = Number(ms != null ? ms : (this.CFG.ui_cooldown_ms || 1000));
      if (dur <= 0) return;
      this.inFlight = true;
      this.setLoading();
      this.cooldownEndsAt = Date.now() + dur;
    }
    scheduleSuccess(name) {
      const remaining = Math.max(0, this.cooldownEndsAt - Date.now());
      if (this.toSuccessTimer) clearTimeout(this.toSuccessTimer);
      this.toSuccessTimer = setTimeout(() => {
        this.setSuccess(name);
        const successMs = Number(this.CFG.success_toast_ms || 1500);
        if (this.successHideTimer) clearTimeout(this.successHideTimer);
        this.successHideTimer = setTimeout(() => { this.setIdle(); this.inFlight = false; }, successMs);
      }, remaining);
    }
    abortToIdle() {
      this.clearTimers();
      this.setIdle();
      this.inFlight = false;
    }
    clearTimers() {
      if (this.toSuccessTimer) { clearTimeout(this.toSuccessTimer); this.toSuccessTimer = null; }
      if (this.successHideTimer) { clearTimeout(this.successHideTimer); this.successHideTimer = null; }
    }

    // ---------- Lock ----------
    engageLock(reason) {
      this.abortToIdle();
      this.isLocked = true;
      if (this.$manual) this.$manual.setAttribute('disabled', 'disabled');
      if (this.$lockDesc) {
        this.$lockDesc.textContent = (reason === 'duplicate')
          ? 'Duplicate detected. Enter admin password to continue.'
          : 'Enter admin password to continue.';
      }
      if (this.$lockError) this.$lockError.style.display = 'none';
      if (this.$lock) this.$lock.classList.add('show');
      if (this.$lockInput) {
        this.$lockInput.value = '';
        setTimeout(() => { try { this.$lockInput.value = ''; } catch (_) {} }, 0);
        setTimeout(() => this.$lockInput && this.$lockInput.focus(), 50);
      }
      try { localStorage.setItem('qr_lock', reason || 'duplicate'); } catch (_) {}
      if (this.DEBUG) console.debug('[QR] engageLock:', reason);
    }
    releaseLock() {
      this.isLocked = false;
      if (this.$lock) this.$lock.classList.remove('show');
      if (this.$manual) { this.$manual.removeAttribute('disabled'); this.$manual.value = ''; }
      this.lastCode = ''; this.lastTime = 0; this.inFlight = false;
      try { localStorage.removeItem('qr_lock'); } catch (_) {}
      this.setIdle();
    }
    showLockError(msg) {
      if (this.$lockError) { this.$lockError.textContent = msg || 'Error'; this.$lockError.style.display = 'block'; }
    }

    // ---------- Background device identity ----------
    ensureBackgroundDeviceIdentity() {
      // Ensure device label exists
      this.getOrCreateDeviceLabel();
      // Cache model now
      this.cachedModel = this.deriveDeviceModelFromUA();
      // Try UA-CH high entropy (Android Chromium) for better model; store for next scans
      this.getHighEntropyModelIfAny().then((m) => {
        if (m) {
          this.cachedModel = m;
          try { localStorage.setItem('qr_device_model_he', m); } catch (_) {}
        }
      }).catch(() => {});
      // If we ever stored a better model before, prefer it
      try {
        const saved = localStorage.getItem('qr_device_model_he');
        if (saved) this.cachedModel = saved;
      } catch (_) {}
    }

    getOrCreateDeviceUUID() {
      const KEY = 'qr_scanner_device_uuid';
      try {
        let id = localStorage.getItem(KEY);
        if (!id) {
          id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
          localStorage.setItem(KEY, id);
        }
        return id;
      } catch (e) {
        return null;
      }
    }

    // No-UI device label: generate once and persist (human-friendly)
    getOrCreateDeviceLabel() {
      const KEY = 'qr_device_label';
      try {
        let label = localStorage.getItem(KEY);
        if (label) return label;

        // Build a readable label: OS/Model + short id
        const model = this.deriveDeviceModelFromUA() || 'Device';
        const short = (this.getOrCreateDeviceUUID() || 'xxxxxxxx').slice(0, 8);
        label = `${model.replace(/\s+/g, '-')}-${short}`;
        localStorage.setItem(KEY, label);
        return label;
      } catch (_) {
        return null;
      }
    }

    // Chromium (Android) high-entropy model (async, best-effort)
    async getHighEntropyModelIfAny() {
      try {
        const ua = navigator.userAgentData;
        if (ua && ua.getHighEntropyValues) {
          const res = await ua.getHighEntropyValues(['platform', 'model']);
          if (res && res.model) return res.model;
        }
      } catch (_) {}
      return null;
    }

    // UA’dan makul model (hemen, sync)
    deriveDeviceModelFromUA() {
      const ua = navigator.userAgent || '';
      // OS
      let os = /Windows NT/i.test(ua) ? 'Windows'
            : /Mac OS X/i.test(ua)    ? 'macOS'
            : /Android/i.test(ua)     ? 'Android'
            : /iPhone|iPad|iOS/i.test(ua) ? 'iOS'
            : /Linux/i.test(ua)       ? 'Linux'
            : 'Other';
      // Browser
      let br = /Edg\//.test(ua) ? 'Edge'
             : /Chrome\//.test(ua) && !/Chromium/.test(ua) ? 'Chrome'
             : /Safari\//.test(ua) && !/Chrome\//.test(ua) ? 'Safari'
             : /Firefox\//.test(ua) ? 'Firefox'
             : 'Browser';

      // Android: bazı UA’larda “... Android 13; Pixel 7 Build/TQ3A...” → Pixel 7 yakala
      if (os === 'Android') {
        const m = ua.match(/Android [^;]*;?\s*([^;)]*?)\s+Build\//i);
        if (m && m[1]) return `Android ${m[1].trim()}`;
      }
      if (os === 'iOS') {
        if (/iPad/i.test(ua)) return 'iPad';
        if (/iPhone/i.test(ua)) return 'iPhone';
        return 'iOS Device';
      }
      return `${os} ${br}`;
    }

    // ---------- Device/Client Meta ----------
    collectClientMeta() {
      const nav = window.navigator || {};
      const scr = window.screen || {};
      return {
        input_method: 'USB Scanner',                       // mevcut akış (manuel ayrımı istenirse sonra ekleriz)
        device_uuid: this.getOrCreateDeviceUUID(),
        device_label: this.getOrCreateDeviceLabel(),       // << arka planda üretildi
        device_vendor: nav.vendor || null,
        device_model: this.cachedModel || this.deriveDeviceModelFromUA(),  // << sync + he varsa sonraki kayıtlarda
        client_platform: nav.platform || null,
        client_lang: nav.language || null,
        client_hw_threads: (typeof nav.hardwareConcurrency === 'number') ? nav.hardwareConcurrency : null,
        client_screen: (scr && scr.width && scr.height) ? (scr.width + 'x' + scr.height) : null,
        client_user_agent: nav.userAgent || null
      };
    }

    // ---------- SFX ----------
    beep(freq = 880, ms = 110) {
      if (!this.CFG.beep_enabled) return;
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator(); const g = ctx.createGain();
        osc.connect(g); g.connect(ctx.destination);
        osc.type = 'sine'; osc.frequency.value = freq; g.gain.value = 0.06;
        osc.start(); setTimeout(() => { osc.stop(); ctx.close(); }, ms);
      } catch (_) {}
    }
    vibrate(ms = 60) { if (this.CFG.vibrate_enabled && navigator.vibrate) navigator.vibrate(ms); }

    // ---------- Flow ----------
    onScanned(code) {
      if (this.isLocked || this.inFlight) return;
      const now = Date.now();
      if (code === this.lastCode && (now - this.lastTime) < (this.CFG.debounce_ms || 800)) return;
      this.lastCode = code; this.lastTime = now;

      // 1) loading overlay
      this.startCooldown(this.CFG.ui_cooldown_ms);

      // 2) API call with client_meta
      const req = frappe.call({
        method: 'qr_scanner.api.create_scan',
        args: {
          qr_code: code,
          scanned_via: 'USB Scanner',
          client_meta: this.collectClientMeta()
        }
      });

      req.then((r) => {
        const m = r.message || {};
        if (m.created) {
          this.beep(900, 110); this.vibrate(40);
          this.scheduleSuccess(m.name);
        } else if (m.reason === 'duplicate') {
          if (this.CFG.lock_on_duplicate) this.engageLock('duplicate');
          else { frappe.show_alert({ message: 'Duplicate: already scanned.', indicator: 'red' }); this.abortToIdle(); }
          this.beep(220, 160); this.vibrate(90);
        } else {
          const serverMsg =
            m.msg ||
            (r && r._server_messages && (() => { try { return JSON.parse(r._server_messages).join(' '); } catch (_) { return null; } })()) ||
            'Operation failed.';
          frappe.show_alert({ message: serverMsg, indicator: 'red' });
          this.abortToIdle();
          this.beep(220, 160); this.vibrate(90);
        }
      }).catch(() => {
        frappe.show_alert({ message: 'Server unreachable.', indicator: 'red' });
        this.abortToIdle();
        this.beep(220, 160); this.vibrate(90);
      });
    }

    // ---------- Utils ----------
    focusInput() { setTimeout(() => { this.$manual && this.$manual.focus(); }, 30); }
  }

  // ERPNext page hook
  frappe.pages['qr_scanner'].on_page_load = function (wrapper) {
    new QRScannerPage(wrapper);
  };
})();