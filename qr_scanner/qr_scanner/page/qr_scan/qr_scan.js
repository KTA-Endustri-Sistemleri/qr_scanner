frappe.pages['qr-scan'] = {
  on_page_load(wrapper) {
    const page = frappe.ui.make_app_page({
      parent: wrapper,
      title: 'QR Scan',
      single_column: true
    });

    page.main.innerHTML = `
      <div style="padding:20px; text-align:center;">
        <h2>Merhaba 👋</h2>
        <p>Bu metni görüyorsan QR Scan sayfan başarıyla çalışıyor.</p>
      </div>
    `;
  }
};