frappe.pages['qr_scanner_locked_users'].on_page_load = function (wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Kilitli Kullanıcılar',
        single_column: true,
    });
    $('<div id="qr-locked-users-vue-root" />').appendTo(page.main);

    frappe.require('qr_scanner_locked_users.bundle.ts').then(() => {
        if (!window.qrScannerLockedUsers || !window.qrScannerLockedUsers.mount) {
            console.error('[qr_scanner] mount not found on window.qrScannerLockedUsers');
            return;
        }
        window.qrScannerLockedUsers.mount('#qr-locked-users-vue-root', { wrapper });
    }).catch((e) => {
        console.error('[qr_scanner] bundle load error', e);
    });
};
