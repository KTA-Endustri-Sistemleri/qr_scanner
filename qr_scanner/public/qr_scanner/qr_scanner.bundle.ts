import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';

export function mount(selector = '#qr-vue-root', _ctx?: any) {
  const app = createApp(App);
  const pinia = createPinia();
  app.use(pinia);
  app.mount(selector);
}

// ⬇️ EN ÖNEMLİ KISIM: global’e yaz (frappe.require bunu bekliyor)
;(window as any).qrScanner = { mount };