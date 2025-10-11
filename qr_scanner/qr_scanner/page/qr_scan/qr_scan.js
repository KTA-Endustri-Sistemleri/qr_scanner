frappe.pages['qr-scan'] = {
  on_page_load(wrapper) {
    const page = frappe.ui.make_app_page({
      parent: wrapper,
      title: 'QR Scan',
      single_column: true
    });
    page.main.innerHTML = `
      <div style="padding:12px">
        <h2 style="margin:0 0 8px">Merhaba 👋</h2>
        <div>Bu metni görüyorsan Page JS yüklendi.</div>
      </div>
    `;
  }
};