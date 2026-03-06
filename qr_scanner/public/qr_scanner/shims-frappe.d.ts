// This file lives next to App.vue so VS Code definitely includes it.

declare const frappe: {
  call: (method: string, args?: any) => Promise<any>;
  show_alert: (msg: { message: string; indicator?: string } | string, seconds?: number) => void;
  require: (asset: string) => Promise<void>;
  ui?: any;
  msgprint?: any;
  throw?: any;
};

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}