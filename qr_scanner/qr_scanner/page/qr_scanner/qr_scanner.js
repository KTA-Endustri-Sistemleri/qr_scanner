// qr_scanner/qr_scanner/page/qr_scanner/qr_scanner.js
frappe.pages['qr_scanner'].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: 'QR Scanner',
    single_column: true,
  });
  $('<div id="qr-vue-root" />').appendTo(page.main);

  // SADECE bundle adı (app prefix, path yok!)
  frappe.require('qr_scanner.bundle.ts').then(() => {
    console.log('[qr_scanner] bundles loaded. window.qrScanner =', window.qrScanner);
    if (!window.qrScanner || !window.qrScanner.mount) {
      console.error('[qr_scanner] mount not found on window.qrScanner');
      return;
    }
    window.qrScanner.mount('#qr-vue-root', { wrapper });
  }).catch((e) => {
    console.error('[qr_scanner] bundle load error', e);
  });
};