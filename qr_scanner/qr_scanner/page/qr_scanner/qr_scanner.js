// QR Scanner – USB only + Fullscreen Red Lock (client-side, no server lock)
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
          <input id="qrLockInput" class="qr-lock-input" type="password" placeholder="Yönetici parolası" />
          <button id="qrLockBtn" class="qr-lock-btn" type="submit">Kilidi Aç</button>
        </form>
        <div id="qrLockError" class="qr-lock-error">Parola hatalı.</div>
      </div>
    </div>
  `);

  const manual    = document.getElementById('manual');
  const toastsEl  = document.getElementById('qrToastContainer');

  function showSuccessToast(message = '', ms = 1500) {
    if (!toastsEl) return;
    const toast = document.createElement('div');
    toast.className = 'qr-toast qr-toast-success';
    toast.innerHTML = `<div style="flex:1">${frappe.utils.escape_html(message)}</div>`;
    toastsEl.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity .2s ease';
      setTimeout(() => toast.remove(), 180); }, ms);
  }

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

  // --- FULLSCREEN LOCK (client-side) ---
  const lockEl    = document.getElementById('qrLock');
  const lockForm  = document.getElementById('qrLockForm');
  const lockInput = document.getElementById('qrLockInput');
  const lockBtn   = document.getElementById('qrLockBtn');
  const lockErr   = document.getElementById('qrLockError');
  const lockDesc  = document.getElementById('qrLockDesc');
  let isLocked = false;

  // Debounce & in-flight kontrol
  let lastCode = '', lastTime = 0, inFlight = false;

  function engageLock(reason='duplicate') {
    isLocked = true;
    if (manual) manual.setAttribute('disabled', 'disabled');
    if (lockDesc) {
      lockDesc.textContent = (reason === 'duplicate')
        ? 'Yinelenen barkod algılandı. Devam etmek için yönetici parolasını girin.'
        : 'Devam etmek için yönetici parolasını girin.';
    }
    lockErr.style.display = 'none';
    lockEl.classList.add('show');
    try { localStorage.setItem('qr_lock', reason || 'duplicate'); } catch (e) {}
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
    // kritik: debounce & inflight sıfırla
    lastCode = ''; lastTime = 0; inFlight = false;
    try { localStorage.removeItem('qr_lock'); } catch (e) {}
  }

  // Sayfa yüklenince localStorage’a göre kilidi devam ettir
  try {
    const ls = localStorage.getItem('qr_lock');
    if (ls) engageLock(ls);
  } catch (e) {}

  // Parola formu
  lockForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const pw = (lockInput.value || '').trim();
    if (!pw) {
      lockErr.textContent = 'Parola boş olamaz.'; lockErr.style.display = 'block';
      lockInput.classList.add('qr-shake'); setTimeout(() => lockInput.classList.remove('qr-shake'), 300);
      return;
    }
    lockBtn.setAttribute('disabled', 'disabled');

    const req = frappe.call({ method: 'qr_scanner.api.verify_unlock_password', args: { password: pw } });

    req.then(r => {
      const m = r.message || {};
      if (m.ok) {
        releaseLock();
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

  if (manual) {
    manual.addEventListener('blur', () => { if (!isLocked) setTimeout(() => manual.focus(), 50); });
  }

  /* -------- Tarama akışı -------- */
  function showErrorAlert(msg) {
    frappe.show_alert({ message: msg || 'İşlem tamamlanamadı.', indicator: 'red' });
  }

  function onScanned(code) {
    if (isLocked || inFlight) return;
    const now = Date.now();
    if (code === lastCode && (now - lastTime) < 800) return; // debounce
    lastCode = code; lastTime = now;
    inFlight = true;

    const req = frappe.call({
      method: 'qr_scanner.api.create_scan',
      args: { qr_code: code, scanned_via: 'USB Scanner' }
    });

    req.then(r => {
      const m = r.message || {};
      // console.debug('create_scan:', m);
      if (m.created) {
        showSuccessToast(`Kayıt edildi: ${m.name}`, 1800);
        beep(900, 120); vibrate(50);
      } else if (m.reason === 'duplicate') {
        engageLock('duplicate');
        beep(220, 180); vibrate(120);
      } else {
        // Sunucu bir hata/uyarı döndüyse, kullanıcıya içeriği göster
        const serverMsg =
          (m.msg) ||
          (r && r._server_messages && (() => {
            try { return JSON.parse(r._server_messages).join(' '); } catch(e){ return null; }
          })()) ||
          'İşlem tamamlanamadı.';
        showErrorAlert(serverMsg);
        beep(220, 180); vibrate(120);
      }
    }).catch((err) => {
      showErrorAlert('Sunucuya ulaşılamadı.');
      // console.error('create_scan error:', err);
      beep(220, 180); vibrate(120);
    }).finally ? req.finally(() => { inFlight = false; }) :
                 req.always  ? req.always(() => { inFlight = false; }) :
                               req.then(() => { inFlight = false; }).catch(() => { inFlight = false; });
  }

  if (manual) {
    manual.addEventListener('keydown', (e) => {
      if (isLocked) return;
      if (e.key === 'Enter') {
        const val = manual.value.trim();
        if (val) onScanned(val);
        manual.value = '';
      }
    });
    manual.focus();
  }
};