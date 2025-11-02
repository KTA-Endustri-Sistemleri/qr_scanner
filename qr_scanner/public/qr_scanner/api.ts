import type { ClientMeta, ClientSettings, CreateScanResponse } from './types';

declare const frappe: any;

export async function getClientSettings(): Promise<ClientSettings> {
  const r = await frappe.call('qr_scanner.api.get_client_settings');
  return r?.message || {};
}

export async function createScan(qr_code: string, meta: ClientMeta = {}): Promise<CreateScanResponse> {
  const r = await frappe.call('qr_scanner.api.create_scan', { qr_code, meta });
  return r?.message || { ok: false, reason: 'error', msg: 'No response' };
}

export async function verifyUnlockPassword(password: string): Promise<boolean> {
  const r = await frappe.call('qr_scanner.api.verify_unlock_password', { password });
  return !!r?.message?.ok;
}