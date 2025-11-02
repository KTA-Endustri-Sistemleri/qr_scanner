frappe.pages['qr_scanner'].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: 'QR Scanner',
    single_column: true,
  });
  $('<div id="qr-vue-root" />').appendTo(page.main);

  // SADECE bundle adı (app prefix, path yok!)
  frappe.require('qr_scanner.bundle.js').then(() => {
    window.qrScanner?.mount?.('#qr-vue-root', { wrapper });
  });
};