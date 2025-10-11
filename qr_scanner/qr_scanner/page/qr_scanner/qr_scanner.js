// apps/qr_scanner/qr_scanner/page/qr_scanner/qr_scanner.js
frappe.pages['qr_scanner'].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: 'QR Scanner',
    single_column: true
  });

  // HTML'i güvenli şekilde tek seferde yerleştir
  $(page.body).html(`
    <div class="p-3">
      <div class="mb-3">
        <input id="manual" type="text" class="form-control"
               placeholder="USB tarayıcıyla okutun veya elle yazıp Enter'a basın" autofocus />
      </div>
      <div id="status" class="text-muted mb-3">Hazır</div>
      <video id="video" playsinline autoplay style="width:100%;max-height:60vh"></video>
    </div>
  `);

  const manual = $(page.body).find('#manual')[0];
  const status = $(page.body).find('#status')[0];

  function setStatus(t){ if (status) status.textContent = t; }

  function onScanned(code, source){
    setStatus('Okundu: ' + code);
    frappe.call({
      method: 'qr_scanner.api.create_scan',
      args: { qr_code: code, scanned_via: source || 'Desk Page' }
    }).then(r => {
      const m = r.message || {};
      if (m.created) setStatus('Kayıt edildi: ' + m.name);
      else if (m.reason === 'duplicate') setStatus('Duplicate: daha önce okutulmuş.');
      else setStatus('İşlem: ' + JSON.stringify(m));
    }).catch(() => setStatus('Sunucu hatası'));
  }

  if (manual) {
    manual.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = manual.value.trim();
        if (val) onScanned(val, 'USB');
        manual.value = '';
      }
    });
  }
};