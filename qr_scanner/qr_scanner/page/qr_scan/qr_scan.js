frappe.pages['qr-scan'] = {
  on_page_load: function(wrapper) {
    const page = frappe.ui.make_app_page({
      parent: wrapper,
      title: 'QR Scan',
      single_column: true
    });
    $(wrapper).append('<div class="mt-4">QR Scanner page is alive ✅</div>');
  }
};