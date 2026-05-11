// Admin session cookie: HMAC-signed payload, no server-side storage needed.
// Format: base64url(JSON_payload).base64url(HMAC_SHA256_of_payload)

export const SESSION_COOKIE = 'aeth_admin_session';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

const enc = new TextEncoder();

function b64urlEncode(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s) {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const str = atob(b64);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
}

async function importKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function createSessionCookie(secret) {
  if (!secret) throw new Error('ADMIN_SESSION_SECRET missing');
  const payload = { exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS };
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = b64urlEncode(enc.encode(payloadStr));

  const key = await importKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payloadB64));
  const token = `${payloadB64}.${b64urlEncode(sig)}`;

  return [
    `${SESSION_COOKIE}=${token}`,
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    'Path=/',
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ].join('; ');
}

export function clearSessionCookie() {
  return [
    `${SESSION_COOKIE}=`,
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    'Path=/',
    'Max-Age=0',
  ].join('; ');
}

export function readCookie(request, name) {
  const header = request.headers.get('Cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return rest.join('=');
  }
  return null;
}

export async function verifySession(request, secret) {
  if (!secret) return false;
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return false;

  const dot = token.indexOf('.');
  if (dot === -1) return false;
  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);

  try {
    const key = await importKey(secret);
    const ok = await crypto.subtle.verify('HMAC', key, b64urlDecode(sigB64), enc.encode(payloadB64));
    if (!ok) return false;

    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(payloadB64)));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return false;

    return true;
  } catch {
    return false;
  }
}
