import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';

export function mount(selector = '#qr-locked-users-vue-root', _ctx?: any) {
    const app = createApp(App);
    const pinia = createPinia();
    app.use(pinia);
    app.mount(selector);
}

// Global binding for frappe.require
; (window as any).qrScannerLockedUsers = { mount };
