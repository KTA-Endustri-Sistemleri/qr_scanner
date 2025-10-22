// --- QR Scanner – USB only + Fullscreen Red Lock (client-side) ---
frappe.pages['qr_scanner'].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({ parent: wrapper, title: 'QR Scanner', single_column: true });

  $(page.body).html(`
    <style>
      .qr-wrap { max-width: 680px; margin: 24px auto; }
      .qr-title { font-weight: 600; font-size: 1.1rem; margin-bottom: 8px; }
      .qr-input { font-size: 1.25rem; padding: 14px 16px; height: auto; }
      .qr-help { color: #6c757d; margin-top: 8px; }

      .qr-lock { position: fixed; inset: 0; background: #dc3545; z-index: 10000; display: none; color: #fff; }
      .qr-lock.show { display: flex; }
      .qr-lock-inner { margin: auto; width: min(560px, 90vw); background: rgba(0,0,0,0.18);
        border-radius: 14px; padding: 20px; box-shadow: 0 12px 40px rgba(0,0,0,.35); backdrop-filter: blur(2px); }
      .qr-lock-title { font-size: 1.25rem; font-weight: 700; margin-bottom: 6px; }
      .qr-lock-desc { opacity: .9; margin-bottom: 14px; }
      .qr-lock-form { display: flex; gap: 8px; }
      .qr-lock-input { flex: 1; padding: 12px 14px; border-radius: 10px; border: none; outline: none; font-size: 1.1rem; }
      .qr-lock-btn { padding: 12px 16px; border-radius: 10px; border: none; cursor: pointer; font-weight: 600; }
      .qr-lock-btn:disabled { opacity: .6; cursor: not-allowed; }
      .qr-lock-error { margin-top: 10px; font-weight: 600; display: none; }
      .qr-shake { animation: qrshake .28s linear 1; }
      @keyframes qrshake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }

      .qr-toast-container { position: fixed; top: 16px; left: 50%; transform: translateX(-50%); z-index: 9999; display: flex; flex-direction: column; gap: 10px; align-items: center; pointer-events: none; }
      .qr-toast { min-width: 280px; max-width: 90vw; border-radius: 10px; padding: 12px 14px; color: #fff; box-shadow: 0 8px 30px rgba(0,0,0,.18); display: flex; align-items: center; gap: 10px; pointer-events: auto; }
      .qr-toast-success { background: #28a745; }
    </style>

    <div class="qr-wrap card p-4">
      <div class="qr-title">USB / Klavye Wedge</div>
      <input id="manual" type="text" class="form-control qr-input"
             placeholder="USB tarayıcıyla okutun veya elle yazıp Enter'a basın" autofocus />
      <div class="qr-help">Başarılı kayıtlar yeşil toast; duplicate olursa parola istenir (yerel kilit).</div>
    </div>

    <div id="qrToastContainer" class="qr-toast-container" aria-live="polite" aria-atomic="true"></div>

    <div id="qrLock" class="qr-lock" role="dialog" aria-modal="true" aria-labelledby="qrLockTitle">
      <div class="qr-lock-inner">
        <div id="qrLockTitle" class="qr-lock-title">Erişim Kilitli</div>
        <div id="qrLockDesc" class="qr-lock-desc">Yinelenen barkod algılandı. Devam etmek için yönetici parolasını girin.</div>
        <form id="qrLockForm" class="qr-lock-form" autocomplete="off">
          <!-- dummy input: bazı tarayıcıların autofill'ini kırar -->
          <input type="text" tabindex="-1" aria-hidden="true" style="position:absolute;left:-9999px;top:-9999px" />
          <input
            id="qrLockInput"
            class="qr-lock-input"
            type="password"
            placeholder="Yönetici parolası"
            name="unlock_pwd"
            autocomplete="new-password"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
            inputmode="text"
          />
          <button id="qrLockBtn" class="qr-lock-btn" type="submit">Kilidi Aç</button>
        </form>
        <div id="qrLockError" class="qr-lock-error">Parola hatalı.</div>
      </div>
    </div>
  `);

  const manual   = document.getElementById('manual');
  const toastsEl = document.getElementById('qrToastContainer');

  // ---------- Server settings (QR Scan Settings) ----------
  let CFG = {
    success_toast_ms: 1500,
    beep_enabled: 1,
    vibrate_enabled: 1,
    debounce_ms: 800,
    autofocus_back: 1,
    silence_ms: 120,
    lock_on_duplicate: 1
  };

  const applySettings = (s) => {
    if (!s) return;
    CFG = Object.assign(CFG, s || {});
  };

  // Ayarları çek (parola burada asla dönmez)
  frappe.call({ method: 'qr_scanner.api.get_client_settings' })
    .then(r => applySettings(r.message))
    .catch(() => { /* sessiz geç, defaults */ });

  // ---------- Toast ----------
  function showSuccessToast(message = '', msOverride) {
    if (!toastsEl) return;
    const ms = typeof msOverride === 'number' ? msOverride : (CFG.success_toast_ms || 1500);
    const toast = document.createElement('div');
    toast.className = 'qr-toast qr-toast-success';
    toast.innerHTML = `<div style="flex:1">${frappe.utils.escape_html(message)}</div>`;
    toastsEl.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity .2s ease';
      setTimeout(() => toast.remove(), 180);
    }, ms);
  }

  // ---------- Beep & Vibrate ----------
  function beep(freq=880, ms=110) {
    if (!CFG.beep_enabled) return;
    try {
      const ctx = new (window.AudioContext||window.webkitAudioContext)();
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.value = freq; gain.gain.value = 0.06;
      osc.start(); setTimeout(() => { osc.stop(); ctx.close(); }, ms);
    } catch (e) {}
  }
  function vibrate(ms=60) {
    if (!CFG.vibrate_enabled) return;
    if (navigator.vibrate) navigator.vibrate(ms);
  }

  // ---------- STATE ----------
  const DEBUG = window.QR_DEBUG === true;
  let isLocked = false;
  let lastCode = '', lastTime = 0, inFlight = false;

  function engageLock(reason='duplicate') {
    isLocked = true;
    manual?.setAttribute('disabled','disabled');

    const lockDesc  = document.getElementById('qrLockDesc');
    const lockErr   = document.getElementById('qrLockError');
    const lockEl    = document.getElementById('qrLock');
    const lockInput = document.getElementById('qrLockInput');

    if (lockDesc) {
      lockDesc.textContent = (reason === 'duplicate')
        ? 'Yinelenen barkod algılandı. Devam etmek için yönetici parolasını girin.'
        : 'Devam etmek için yönetici parolasını girin.';
    }

    lockErr.style.display = 'none';
    lockEl.classList.add('show');

    // her açılışta parola alanını kesin temizle (autofill'e karşı iki kez)
    if (lockInput) {
      lockInput.value = '';
      setTimeout(() => { try { lockInput.value = ''; } catch(e) {} }, 0);
    }

    try { localStorage.setItem('qr_lock', reason || 'duplicate'); } catch (e) {}
    setTimeout(() => lockInput && lockInput.focus(), 50);
    if (DEBUG) console.debug('[QR] engageLock:', reason);
  }

  function releaseLock() {
    isLocked = false;
    document.getElementById('qrLock').classList.remove('show');
    if (manual) {
      manual.removeAttribute('disabled');
      manual.value = '';
      setTimeout(() => manual.focus(), 30);
    }
    // kritik resetler + parola alanını temizle
    lastCode = ''; lastTime = 0; inFlight = false;
    const lockInput = document.getElementById('qrLockInput');
    if (lockInput) lockInput.value = '';
    try { localStorage.removeItem('qr_lock'); } catch (e) {}
    if (DEBUG) console.debug('[QR] releaseLock: state reset');
  }

  // Odak geldiğinde bir kez daha boşalt (ısrarcı autofill için)
  (document.getElementById('qrLockInput') || {}).addEventListener?.('focus', () => {
    const el = document.getElementById('qrLockInput'); if (el) el.value = '';
  }, { once: true });

  // Sayfa yüklenince localStorage’a göre kilidi devam ettir
  try {
    const ls = localStorage.getItem('qr_lock');
    if (ls) engageLock(ls);
  } catch (e) {}

  // ---------- Parola formu ----------
  document.getElementById('qrLockForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const lockInput = document.getElementById('qrLockInput');
    const lockErr   = document.getElementById('qrLockError');
    const lockBtn   = document.getElementById('qrLockBtn');
    const pw = (lockInput.value || '').trim();

    if (!pw) {
      lockErr.textContent = 'Parola boş olamaz.'; lockErr.style.display = 'block';
      lockInput.classList.add('qr-shake'); setTimeout(() => lockInput.classList.remove('qr-shake'), 300);
      return;
    }
    lockBtn.setAttribute('disabled','disabled');

    const req = frappe.call({ method: 'qr_scanner.api.verify_unlock_password', args: { password: pw } });

    req.then(r => {
      const m = r.message || {};
      if (DEBUG) console.debug('[QR] verify_unlock_password resp:', m);
      if (m.ok) {
        lockInput.value = '';
        releaseLock();
        beep(880,120); vibrate(50);
      } else {
        lockErr.textContent = (m.reason === 'not_configured')
          ? 'Parola yapılandırılmamış. Lütfen yöneticinize başvurun.'
          : 'Parola hatalı.';
        lockErr.style.display = 'block';
        lockInput.value = '';
        lockInput.classList.add('qr-shake'); setTimeout(() => lockInput.classList.remove('qr-shake'), 300);
        beep(220,180); vibrate(120);
      }
    }).catch((err) => {
      if (DEBUG) console.error('[QR] verify_unlock_password error:', err);
      lockErr.textContent = 'Sunucuya ulaşılamadı.'; lockErr.style.display = 'block';
      lockInput.value = '';
      beep(220,180); vibrate(120);
    });

    (req.finally||req.always||function(f){req.then(f).catch(f)})(() => lockBtn.removeAttribute('disabled'));
  });

  // ---------- Yardımcılar ----------
  function showErrorAlert(msg) {
    frappe.show_alert({ message: msg || 'İşlem tamamlanamadı.', indicator: 'red' });
  }

  // ---------- Tarama akışı ----------
  function onScanned(code) {
    if (isLocked || inFlight) return;
    const now = Date.now();
    if (code === lastCode && (now - lastTime) < (CFG.debounce_ms || 800)) return; // debounce ayardan
    lastCode = code; lastTime = now; inFlight = true;

    const req = frappe.call({
      method: 'qr_scanner.api.create_scan',
      args: { qr_code: code, scanned_via: 'USB Scanner' }
    });

    req.then(r => {
      const m = r.message || {};
      if (m.created) {
        showSuccessToast(`Kayıt edildi: ${m.name}`, CFG.success_toast_ms);
        beep(900,120); vibrate(50);
      } else if (m.reason === 'duplicate') {
        if (CFG.lock_on_duplicate) {
          engageLock('duplicate');
        } else {
          showErrorAlert('Duplicate: bu barkod daha önce okutulmuş.');
        }
        beep(220,180); vibrate(120);
      } else {
        const serverMsg =
          m.msg ||
          (r && r._server_messages && (() => { try { return JSON.parse(r._server_messages).join(' '); } catch(e){ return null; } })()) ||
          'İşlem tamamlanamadı.';
        showErrorAlert(serverMsg);
        beep(220,180); vibrate(120);
      }
    }).catch(() => {
      showErrorAlert('Sunucuya ulaşılamadı.');
      beep(220,180); vibrate(120);
    });

    (req.finally||req.always||function(f){req.then(f).catch(f)})(() => { inFlight = false; });
  }

  // Enter ile gönderim
  manual?.addEventListener('keydown', (e) => {
    if (isLocked) return;
    if (e.key === 'Enter') {
      const val = manual.value.trim();
      if (val) onScanned(val);
      manual.value = '';
    }
  });

  // Odak kaçarsa geri al (ayar bağlı)
  manual?.addEventListener('blur', () => { if (CFG.autofocus_back && !isLocked) setTimeout(() => manual.focus(), 50); });

  manual?.focus();
};