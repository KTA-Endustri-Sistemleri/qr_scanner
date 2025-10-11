frappe.pages['qr-scanner'].on_page_load = function(wrapper) {
  const $ = frappe.dom;
  const page = frappe.ui.make_app_page({ parent: wrapper, title: 'QR Scanner', single_column: true });

  const manual = wrapper.querySelector('#manual');
  const status = wrapper.querySelector('#status');

  function onScanned(code, source) {
    status.textContent = 'Okundu: ' + code;
    frappe.call({
      method: 'qr_scanner.api.create_scan',
      args: { qr_code: code, scanned_via: source || 'Desk Page' }
    }).then(r => {
      const msg = r.message || {};
      if (msg.created) status.textContent = 'Kayıt edildi: ' + msg.name;
      else if (msg.reason === 'duplicate') status.textContent = 'Duplicate: daha önce okutulmuş.';
      else status.textContent = 'İşlem: ' + JSON.stringify(msg);
    }).catch(() => status.textContent = 'Sunucu hatası');
  }

  manual?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = manual.value.trim();
      if (val) onScanned(val, 'USB');
      manual.value = '';
    }
  });

  // Kamerayı başlatmak istiyorsan buraya getUserMedia + jsQR/ZXing entegrasyonunu ekle
};