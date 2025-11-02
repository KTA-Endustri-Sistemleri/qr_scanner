import { createApp } from 'vue';
import App from './App.vue';

declare global { interface Window { qrScanner?: any; } }

export function mount(selector: string, props: Record<string, any> = {}) {
  const el = document.querySelector(selector);
  if (!el) throw new Error('Mount element not found: ' + selector);
  const app = createApp(App, props);
  app.mount(el);
  return app;
}

window.qrScanner = { mount };