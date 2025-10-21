// QR Scanner Desk Page – USB only + Fullscreen Red Lock with server-persisted state
frappe.pages['qr_scanner'].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: 'QR Scanner',
    single_column: true
  });

  $(page.body).html(`
    <style>
      .qr-wrap { max-width: 680px; margin: 24px auto; }
      .qr-title { font-weight: 600; font-size: 1.1rem; margin-bottom: 8px; }
      .qr-input { font-size: 1.25rem; padding: 14px 16px; height: auto; }
      .qr-help { color: #6c757d; margin-top: 8px; }

      /* --- FULLSCREEN LOCK --- */
      .qr-lock {
        position: fixed; inset: 0; background: #dc3545; /* kırmızı */
        z-index: 10000; display: none; /* kilitlenince block yapılır */
        color: #fff;
      }
      .qr-lock.show { display: flex; }
      .qr-lock-inner {
        margin: auto; width: min(560px, 90vw);
        background: rgba(0,0,0,0.18);
        border-radius: 14px; padding: 20px;
        box-shadow: 0 12px 40px rgba(0,0,0,.35);
        backdrop-filter: blur(2px);
      }
      .qr-lock-title { font-size: 1.25rem; font-weight: 700; margin-bottom: 6px; }
      .qr-lock-desc { opacity: .9; margin-bottom: 14px; }
      .qr-lock-form { display: flex; gap: 8px; }
      .qr-lock-input {
        flex: 1; padding: 12px 14px; border-radius: 10px; border: none; outline: none;
        font-size: 1.1rem;
      }
      .qr-lock-btn {
        padding: 12px 16px; border-radius: 10px; border: none; cursor: pointer;
        font-weight: 600;
      }
      .qr-lock-btn:disabled { opacity: .6; cursor: not-allowed; }
      .qr-lock-error { margin-top: 10px; font-weight: 600; display: none; }
      .qr-shake { animation: qrshake .28s linear 1; }
      @keyframes qrshake {
        0%,100% { transform: translateX(0); }
        20% { transform: translateX(-6px); }
        40% { transform: translateX(6px); }
        60% { transform: translateX(-4px); }
        80% { transform: translateX(4px); }
      }

      /* Success toast (sadece başarılı kayıtlarda) */
      .qr-toast-container {
        position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
        z-index: 9999; display: flex; flex-direction: column; gap: 10px; align-items: center;
        pointer-events: none;
      }
      .qr-toast {
        min-width: 280px; max-width: 90vw;
        border-radius: 10px; padding: 12px 14px; color: #fff;
        box-shadow: 0 8px 30px rgba(0,0,0,.18);
        display: flex; align-items: center; gap: 10px;
        pointer-events: auto;
      }
      .qr-toast-success { background: #28a745; }
      .qr-toast .qr-close { display:none; }
    </style>

    <div class="qr-wrap card p-4">
      <div class="qr-title">USB / Klavye Wedge</div>
      <input id="manual" type="text" class="form-control qr-input"
             placeholder="USB tarayıcıyla okutun veya elle yazıp Enter'a basın" autofocus />
      <div class="qr-help">Başarılı kayıtlar yeşil toast; hata/duplicate durumunda ekran kilitlenir.</div>
    </div>

    <div id="qrToastContainer" class="qr-toast-container" aria-live="polite" aria-atomic="true"></div>

    <!-- FULLSCREEN LOCK -->
    <div id="qrLock" class="qr-lock" role="dialog" aria-modal="true" aria-labelledby="qrLockTitle">
      <div class="qr-lock-inner">
        <div id="qrLockTitle" class="qr-lock-title">Erişim Kilitli</div>
        <div id="qrLockDesc" class="qr-lock-desc">Hata veya yinelenen barkod algılandı. Devam etmek için yönetici parolasını girin.</div>
        <form id="qrLockForm" class="qr-lock-form" autocomplete="off">
          <input id="qrLockInput" class="qr-lock-input" type="password" placeholder="Yönetici parolası" />
          <button id="qrLockBtn" class="qr-lock-btn" type="submit">Kilidi Aç</button>
        </form>
        <div id="qrLockError" class="qr-lock-error">Parola hatalı.</div>
      </div>
    </div>
  `);

  const manual    = document.getElementById('manual');
  const toastsEl  = document.getElementById('qrToastContainer');

  /* -------- Toast (sadece success için) -------- */
  function showSuccessToast(message = '', ms = 1500) {
    if (!toastsEl) return;
    const toast = document.createElement('div');
    toast.className = `qr-toast qr-toast-success`;
    toast.innerHTML = `<div style="flex:1">${frappe.utils.escape_html(message)}</div>`;
    toastsEl.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity .2s ease';
      setTimeout(() => toast.remove(), 180);
    }, ms);
  }

  /* -------- Ses & titreşim (opsiyonel) -------- */
  function beep(freq=880, ms=110) {
    try {
      const ctx = new (window.AudioContext||window.webkitAudioContext)();
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.value = freq; gain.gain.value = 0.06;
      osc.start(); setTimeout(() => { osc.stop(); ctx.close(); }, ms);
    } catch (e) {}
  }
  function vibrate(ms=60) { if (navigator.vibrate) navigator.vibrate(ms); }

  /* -------- FULLSCREEN LOCK yardımcıları -------- */
  const lockEl    = document.getElementById('qrLock');
  const lockForm  = document.getElementById('qrLockForm');
  const lockInput = document.getElementById('qrLockInput');
  const lockBtn   = document.getElementById('qrLockBtn');
  const lockErr   = document.getElementById('qrLockError');
  const lockDesc  = document.getElementById('qrLockDesc');

  let isLocked = false;

  function engageLock(reason = 'error') {
    isLocked = true;
    if (manual) manual.setAttribute('disabled', 'disabled');
    if (lockDesc) {
      lockDesc.textContent = (reason === 'duplicate')
        ? 'Yinelenen barkod algılandı. Devam etmek için yönetici parolasını girin.'
        : 'Hata oluştu. Devam etmek için yönetici parolasını girin.';
    }
    lockErr.style.display = 'none';
    lockEl.classList.add('show');
    setTimeout(() => lockInput.focus(), 50);
  }
  function releaseLock() {
    isLocked = false;
    lockEl.classList.remove('show');
    if (manual) {
      manual.removeAttribute('disabled');
      manual.value = '';
      setTimeout(() => manual.focus(), 30);
    }
  }

  // Sayfa yüklenince sunucudan kilit durumunu sor
  frappe.call({ method: 'qr_scanner.api.get_lock_state' })
    .then(r => {
      const s = r.message || {};
      if (s.locked) {
        engageLock(s.reason || 'error');
      } else {
        releaseLock();
      }
    })
    .catch(() => { /* sessiz geç */ });

  // Duplicate tetiklerinde sunucuda kilit + UI, error’da sadece UI
  function lockAndEngage(reason) {
    const p = frappe.call({
      method: 'qr_scanner.api.set_lock',
      args: { reason: reason || 'error' }
    });
    if (p && typeof p.always === 'function') {
      p.always(() => engageLock(reason || 'error'));
    } else if (p && typeof p.finally === 'function') {
      p.finally(() => engageLock(reason || 'error'));
    } else {
      p.then(() => engageLock(reason || 'error')).catch(() => engageLock(reason || 'error'));
    }
  }

  lockForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const pw = (lockInput.value || '').trim();
    if (!pw) {
      lockErr.textContent = 'Parola boş olamaz.'; lockErr.style.display = 'block';
      lockInput.classList.add('qr-shake'); setTimeout(() => lockInput.classList.remove('qr-shake'), 300);
      return;
    }
    lockBtn.setAttribute('disabled', 'disabled');

    // Parolayı sunucuda doğrula (server başarıda clear_lock yapıyor)
    const req = frappe.call({
      method: 'qr_scanner.api.verify_unlock_password',
      args: { password: pw }
    });

    req.then(r => {
      const m = r.message || {};
      if (m.ok) {
        // ekstra emniyet: clear_lock tekrar
        const c = frappe.call({ method: 'qr_scanner.api.clear_lock' });
        if (c && typeof c.always === 'function') c.always(() => releaseLock());
        else if (c && typeof c.finally === 'function') c.finally(() => releaseLock());
        else c.then(() => releaseLock()).catch(() => releaseLock());
        beep(880, 120); vibrate(50);
      } else {
        lockErr.textContent = (m.reason === 'not_configured')
          ? 'Parola yapılandırılmamış. Lütfen yöneticinize başvurun.'
          : 'Parola hatalı.';
        lockErr.style.display = 'block';
        lockInput.value = '';
        lockInput.classList.add('qr-shake'); setTimeout(() => lockInput.classList.remove('qr-shake'), 300);
        beep(220, 180); vibrate(120);
      }
    }).catch(() => {
      lockErr.textContent = 'Sunucuya ulaşılamadı.'; lockErr.style.display = 'block';
      beep(220, 180); vibrate(120);
    });

    if (req && typeof req.always === 'function') {
      req.always(() => lockBtn.removeAttribute('disabled'));
    } else if (req && typeof req.finally === 'function') {
      req.finally(() => lockBtn.removeAttribute('disabled'));
    } else {
      req.then(() => lockBtn.removeAttribute('disabled'))
         .catch(() => lockBtn.removeAttribute('disabled'));
    }
  });

  // Odak kaçarsa input’u geri al (kilitli değilse)
  if (manual) {
    manual.addEventListener('blur', () => { if (!isLocked) setTimeout(() => manual.focus(), 50); });
  }

  /* -------- Tarama akışı -------- */
  let lastCode = '', lastTime = 0;

  function onScanned(code) {
    if (isLocked) return; // kilitliyken işlem yapma
    const now = Date.now();
    if (code === lastCode && (now - lastTime) < 800) return; // debounce
    lastCode = code; lastTime = now;

    frappe.call({
      method: 'qr_scanner.api.create_scan',
      args: { qr_code: code, scanned_via: 'USB Scanner' }
    }).then(r => {
      const m = r.message || {};
      if (m.created) {
        showSuccessToast(`Kayıt edildi: ${m.name}`, 1800);
        beep(900, 120); vibrate(50);
      } else if (m.reason === 'duplicate') {
        // duplicate: sunucuda kilitle + UI
        lockAndEngage('duplicate');
        beep(220, 180); vibrate(120);
      } else if (m.reason === 'locked') {
        // Sunucu zaten kilitli diyorsa UI'ı da kilitle
        engageLock('error');
        beep(220, 180); vibrate(120);
      } else {
        // Genel hata: sadece UI kilidi (server'a lock yazma)
        engageLock('error');
        beep(220, 180); vibrate(120);
      }
    }).catch(() => {
      // Ağ/parse hatası: sadece UI kilidi
      engageLock('error');
      beep(220, 180); vibrate(120);
    });
  }

  if (manual) {
    manual.addEventListener('keydown', (e) => {
      if (isLocked) return; // kilitliyken hiçbir şey yapma
      if (e.key === 'Enter') {
        const val = manual.value.trim();
        if (val) onScanned(val);
        manual.value = '';
      }
    });
    manual.focus();
  }
};
