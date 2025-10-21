// --- sadece değişen/önemli kısımları vurguladım; bütün dosyayı koyuyorum ---
frappe.pages['qr_scanner'].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({ parent: wrapper, title: 'QR Scanner', single_column: true });

  $(page.body).html(`... (stil ve HTML seninle aynı, kesiyorum) ...`);

  const manual    = document.getElementById('manual');
  const toastsEl  = document.getElementById('qrToastContainer');

  function showSuccessToast(message = '', ms = 1500) { /* aynı */ }

  function beep(freq=880, ms=110) { /* aynı */ }
  function vibrate(ms=60) { if (navigator.vibrate) navigator.vibrate(ms); }

  // --- STATE ---
  const DEBUG = window.QR_DEBUG === true;
  let isLocked = false;
  let lastCode = '', lastTime = 0, inFlight = false;

  function engageLock(reason='duplicate') {
    isLocked = true;
    manual?.setAttribute('disabled','disabled');
    document.getElementById('qrLockDesc').textContent =
      reason === 'duplicate'
        ? 'Yinelenen barkod algılandı. Devam etmek için yönetici parolasını girin.'
        : 'Devam etmek için yönetici parolasını girin.';
    document.getElementById('qrLockError').style.display = 'none';
    document.getElementById('qrLock').classList.add('show');
    try { localStorage.setItem('qr_lock', reason || 'duplicate'); } catch (e) {}
    setTimeout(() => document.getElementById('qrLockInput').focus(), 50);
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
    // >>> kritik reset <<<
    lastCode = '';
    lastTime = 0;
    inFlight = false;
    try { localStorage.removeItem('qr_lock'); } catch (e) {}
    if (DEBUG) console.debug('[QR] releaseLock: state reset');
  }

  // Sayfa yüklenince localStorage’a göre kilidi devam ettir
  try {
    const ls = localStorage.getItem('qr_lock');
    if (ls) engageLock(ls);
  } catch (e) {}

  // Parola formu (değişmedi, sadece debug/console koydum)
  document.getElementById('qrLockForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const pw = (document.getElementById('qrLockInput').value || '').trim();
    const lockErr = document.getElementById('qrLockError');
    const lockBtn = document.getElementById('qrLockBtn');

    if (!pw) {
      lockErr.textContent = 'Parola boş olamaz.'; lockErr.style.display = 'block';
      document.getElementById('qrLockInput').classList.add('qr-shake');
      setTimeout(() => document.getElementById('qrLockInput').classList.remove('qr-shake'), 300);
      return;
    }
    lockBtn.setAttribute('disabled','disabled');

    const req = frappe.call({ method: 'qr_scanner.api.verify_unlock_password', args: { password: pw } });

    req.then(r => {
      const m = r.message || {};
      if (DEBUG) console.debug('[QR] verify_unlock_password resp:', m);
      if (m.ok) {
        releaseLock();
        beep(880,120); vibrate(50);
      } else {
        lockErr.textContent = (m.reason === 'not_configured') ? 'Parola yapılandırılmamış. Lütfen yöneticinize başvurun.' : 'Parola hatalı.';
        lockErr.style.display = 'block';
        document.getElementById('qrLockInput').value = '';
        document.getElementById('qrLockInput').classList.add('qr-shake');
        setTimeout(() => document.getElementById('qrLockInput').classList.remove('qr-shake'), 300);
        beep(220,180); vibrate(120);
      }
    }).catch((err) => {
      if (DEBUG) console.error('[QR] verify_unlock_password error:', err);
      lockErr.textContent = 'Sunucuya ulaşılamadı.'; lockErr.style.display = 'block';
      beep(220,180); vibrate(120);
    });

    (req.finally||req.always||function(f){req.then(f).catch(f)})(() => lockBtn.removeAttribute('disabled'));
  });

  function showErrorAlert(msg) {
    frappe.show_alert({ message: msg || 'İşlem tamamlanamadı.', indicator: 'red' });
  }

  function onScanned(code) {
    // ENGEL SEBEPLERİNİ LOGLA
    if (isLocked) { if (DEBUG) console.debug('[QR] skip: locked'); return; }
    if (inFlight) { if (DEBUG) console.debug('[QR] skip: inFlight'); return; }

    const now = Date.now();
    if (code === lastCode && (now - lastTime) < 800) {
      if (DEBUG) console.debug('[QR] skip: debounce', {code, dt: now-lastTime});
      return;
    }

    lastCode = code; lastTime = now; inFlight = true;
    if (DEBUG) console.debug('[QR] create_scan →', code);

    const req = frappe.call({
      method: 'qr_scanner.api.create_scan',
      args: { qr_code: code, scanned_via: 'USB Scanner' }
    });

    req.then(r => {
      const m = r.message || {};
      if (DEBUG) console.debug('[QR] create_scan resp:', m, 'server_messages:', r && r._server_messages);
      if (m.created) {
        showSuccessToast(`Kayıt edildi: ${m.name}`, 1800);
        beep(900,120); vibrate(50);
      } else if (m.reason === 'duplicate') {
        engageLock('duplicate');
        beep(220,180); vibrate(120);
      } else {
        const serverMsg =
          m.msg ||
          (r && r._server_messages && (() => { try { return JSON.parse(r._server_messages).join(' '); } catch(e){ return null; } })()) ||
          'İşlem tamamlanamadı.';
        showErrorAlert(serverMsg);
        beep(220,180); vibrate(120);
      }
    }).catch((err) => {
      if (DEBUG) console.error('[QR] create_scan error:', err);
      showErrorAlert('Sunucuya ulaşılamadı.');
      beep(220,180); vibrate(120);
    });

    (req.finally||req.always||function(f){req.then(f).catch(f)})(() => { inFlight = false; if (DEBUG) console.debug('[QR] inFlight=false'); });
  }

  manual?.addEventListener('keydown', (e) => {
    if (isLocked) return;
    if (e.key === 'Enter') {
      const val = manual.value.trim();
      if (val) onScanned(val);
      manual.value = '';
    }
  });

  manual?.focus();
};