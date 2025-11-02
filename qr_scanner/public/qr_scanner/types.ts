export type ClientMeta = {
  input_method?: 'manual' | 'usb_scanner';
  device_uuid?: string;
  device_label?: string;
  device_vendor?: string;
  device_model?: string;
  client_platform?: string;
  client_lang?: string;
  client_hw_threads?: number | null;
  client_screen?: string;
  client_user_agent?: string;
};

export type ClientSettings = {
  success_toast_ms?: number;
  duplicate_sticky?: boolean;
  beep_enabled?: boolean;
  vibrate_enabled?: boolean;
  debounce_ms?: number;
  autofocus_back?: boolean;
};

export type CreateScanResponse = {
  ok: boolean;
  created?: boolean;
  reason?: 'duplicate' | 'locked' | 'error';
  msg?: string;
};