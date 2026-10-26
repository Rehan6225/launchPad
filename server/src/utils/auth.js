const crypto = require('crypto');
const { HttpError } = require('./http');

/**
 * Single-user auth: credentials come from env vars, sessions are HMAC-signed tokens.
 * Fails closed — if the env vars are missing, nobody can log in.
 */

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function config() {
  const { AUTH_USERNAME, AUTH_PASSWORD, AUTH_SECRET } = process.env;
  if (!AUTH_USERNAME || !AUTH_PASSWORD || !AUTH_SECRET) {
    throw new HttpError(500, 'Auth is not configured on the server.');
  }
  return { username: AUTH_USERNAME, password: AUTH_PASSWORD, secret: AUTH_SECRET };
}

/** Constant-time string comparison (hashing first makes lengths equal). */
function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

const sign = (data, secret) => crypto.createHmac('sha256', secret).update(data).digest('base64url');

function checkCredentials(username, password) {
  const cfg = config();
  // Evaluate both so timing doesn't reveal which one was wrong.
  const userOk = safeEqual(username, cfg.username);
  const passOk = safeEqual(password, cfg.password);
  return userOk && passOk;
}

function issueToken(username) {
  const { secret } = config();
  const payload = Buffer.from(
    JSON.stringify({ sub: username, exp: Date.now() + TOKEN_TTL_MS }),
  ).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

function verifyToken(token) {
  const { secret } = config();
  const [payload, signature] = String(token || '').split('.');
  if (!payload || !signature || !safeEqual(signature, sign(payload, secret))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}

/** Express middleware: rejects requests without a valid Bearer token. */
function requireAuth(req, _res, next) {
  try {
    const header = req.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    const session = verifyToken(token);
    if (!session) return next(new HttpError(401, 'Please log in.'));
    req.user = session.sub;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { checkCredentials, issueToken, requireAuth };
