// QR Scanner Desk Page – USB only + görsel toast bildirimleri
frappe.pages['qr_scanner'].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: 'QR Scanner',
    single_column: true
  });

  // Minimal ama şık arayüz
  $(page.body).html(`
    <style>
      .qr-wrap { max-width: 680px; margin: 24px auto; }
      .qr-title { font-weight: 600; font-size: 1.1rem; margin-bottom: 8px; }
      .qr-input { font-size: 1.25rem; padding: 14px 16px; height: auto; }
      .qr-help { color: #6c757d; margin-top: 8px; }
      /* Toast container */
      .qr-toast-container {
        position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
        z-index: 9999; display: flex; flex-direction: column; gap: 10px; align-items: center;
        pointer-events: none; /* tıklamalar toasta, close butonunda etkinleştiriyoruz */
      }
      .qr-toast {
        min-width: 280px; max-width: 90vw;
        border-radius: 10px; padding: 12px 14px; color: #fff;
        box-shadow: 0 8px 30px rgba(0,0,0,.18);
        display: flex; align-items: center; gap: 10px;
        pointer-events: auto; /* close butonu çalışsın */
      }
      .qr-toast-success { background: #28a745; } /* yeşil */
      .qr-toast-error   { background: #dc3545; } /* kırmızı */
      .qr-toast .qr-close {
        margin-left: 8px; border: none; background: rgba(255,255,255,.2);
        color: #fff; border-radius: 6px; padding: 2px 8px; cursor: pointer;
      }
    </style>

    <div class="qr-wrap card p-4">
      <div class="qr-title">USB / Klavye Wedge</div>
      <input id="manual" type="text" class="form-control qr-input"
             placeholder="USB tarayıcıyla okutun veya elle yazıp Enter'a basın" autofocus />
      <div class="qr-help">Başarılı kayıtlar yeşil; yineleyen barkodlar kırmızı uyarı ile görünür.</div>
    </div>

    <div id="qrToastContainer" class="qr-toast-container" aria-live="polite" aria-atomic="true"></div>
  `);

  const manual   = document.getElementById('manual');
  const toastsEl = document.getElementById('qrToastContainer');

  // --- Toast yardımcıları ---
  function showToast({ type = 'success', message = '', autoclose = true, ms = 1500 }) {
    if (!toastsEl) return;
    const toast = document.createElement('div');
    toast.className = `qr-toast ${type === 'success' ? 'qr-toast-success' : 'qr-toast-error'}`;
    toast.innerHTML = `
      <div style="flex:1">${frappe.utils.escape_html(message)}</div>
      <button class="qr-close" ${autoclose ? 'style="display:none"' : ''}>Kapat</button>
    `;
    toastsEl.appendChild(toast);

    // Auto dismiss (başarılı kayıt)
    let timer = null;
    if (autoclose) {
      timer = setTimeout(() => removeToast(), ms);
    }

    // Manuel kapatma (duplicate)
    const closeBtn = toast.querySelector('.qr-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', removeToast);
    }

    function removeToast() {
      if (timer) clearTimeout(timer);
      if (toast && toast.parentNode) {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity .2s ease';
        setTimeout(() => toast.parentNode.removeChild(toast), 180);
      }
    }

    return { remove: removeToast };
  }

  // (opsiyonel) ses & titreşim geri bildirimi
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

  // --- Sunucu çağrısı ---
  let lastCode = '', lastTime = 0;
  function onScanned(code) {
    const now = Date.now();
    // Kısa debounce: aynı kod 800ms içinde tekrar gelirse yoksay
    if (code === lastCode && (now - lastTime) < 800) return;
    lastCode = code; lastTime = now;

    frappe.call({
      method: 'qr_scanner.api.create_scan',
      args: { qr_code: code, scanned_via: 'USB Scanner' }
    }).then(r => {
      const m = r.message || {};
      if (m.created) {
        showToast({ type: 'success', message: `Kayıt edildi: ${m.name}`, autoclose: true, ms: 1800 });
        beep(900, 120); vibrate(50);
      } else if (m.reason === 'duplicate') {
        showToast({ type: 'error', message: 'Duplicate: bu barkod daha önce okutulmuş.', autoclose: false });
        beep(220, 180); vibrate(120);
      } else {
        showToast({ type: 'error', message: 'İşlem tamamlanamadı.', autoclose: false });
      }
    }).catch(() => {
      showToast({ type: 'error', message: 'Sunucu hatası. Lütfen tekrar deneyin.', autoclose: false });
    });
  }

  // --- USB / keyboard wedge
  if (manual) {
    manual.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = manual.value.trim();
        if (val) onScanned(val);
        manual.value = '';
      }
    });
    // odağa kaçarsa geri al
    manual.addEventListener('blur', () => setTimeout(() => manual.focus(), 50));
    manual.focus();
  }
};