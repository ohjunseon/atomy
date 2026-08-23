const COOKIE_NAME = 'atomy_session';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;
const ADMIN_ID = 'atomy';
const ADMIN_PW = 'so797979!';

function checkCredentials(id, password) {
  return id === ADMIN_ID && password === ADMIN_PW;
}

async function importKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function toHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sign(value, secret) {
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return toHex(sig);
}

async function createSessionCookie(secret) {
  const expires = Date.now() + MAX_AGE_MS;
  const payload = String(expires);
  const token = `${payload}.${await sign(payload, secret)}`;
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${Math.floor(MAX_AGE_MS / 1000)}`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}

function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    cookies[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
  });
  return cookies;
}

async function isValidSession(cookieHeader, secret) {
  const token = parseCookies(cookieHeader)[COOKIE_NAME];
  if (!token) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expected = await sign(payload, secret);
  if (expected.length !== sig.length || expected !== sig) return false;
  const expires = Number(payload);
  return Number.isFinite(expires) && Date.now() <= expires;
}

export { checkCredentials, createSessionCookie, clearSessionCookie, isValidSession, COOKIE_NAME };
