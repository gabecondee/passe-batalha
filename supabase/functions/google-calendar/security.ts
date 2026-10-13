export const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

export function allowedOrigin(value: string, configured: string): string {
  const url = new URL(value);
  const origins = configured.split(',').map(item => item.trim()).filter(Boolean);
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (!origins.includes(url.origin) || (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))) {
    throw new Error('Origem não autorizada.');
  }
  return url.origin;
}

export function needsRefresh(expiresAt: string, now = Date.now()): boolean {
  return !Number.isFinite(Date.parse(expiresAt)) || now >= Date.parse(expiresAt) - 60_000;
}

export async function hashState(state: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(state));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

function fromBase64(value: string) {
  return new Uint8Array(Array.from(atob(value), char => char.charCodeAt(0)));
}

export async function tokenKey(value: string): Promise<CryptoKey> {
  const bytes = fromBase64(value);
  if (bytes.length !== 32) throw new Error('Chave de tokens inválida.');
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptToken(value: string, key: CryptoKey, userId: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(userId) }, key, new TextEncoder().encode(value),
  );
  const bytes = new Uint8Array(iv.length + encrypted.byteLength);
  bytes.set(iv);
  bytes.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...bytes));
}

export async function decryptToken(value: string, key: CryptoKey, userId: string): Promise<string> {
  const bytes = fromBase64(value);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: bytes.slice(0, 12), additionalData: new TextEncoder().encode(userId) }, key, bytes.slice(12),
  );
  return new TextDecoder().decode(decrypted);
}
