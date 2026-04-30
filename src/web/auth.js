/**
 * Authentication middleware for the Magazeen web server.
 *
 * Auth is handled entirely by an upstream reverse proxy (nginx + Authelia or
 * oauth2-proxy) which injects signed identity headers. This module trusts those
 * headers and never handles credentials, passwords, sessions, or tokens directly.
 *
 * Header resolution order (first match wins):
 *   1. Remote-User  (preferred – set by Authelia/oauth2-proxy)
 *   2. Remote-Email (fallback identity header)
 *   3. DEV_STUB_USER env var (development-only, ignored in production)
 *   4. Guest sentinel { id: 'guest', email: 'guest@local', ... }
 */

import crypto from 'crypto';

/** Guest sentinel object – indicates an unauthenticated/anonymous request. */
export const GUEST_USER = Object.freeze({
  id: 'guest',
  email: 'guest@local',
  name: 'Guest',
  groups: [],
});

/**
 * Parse the DEV_STUB_USER env var (format: "email:Display Name:group1,group2").
 * Returns null if the string is absent or malformed.
 *
 * @param {string|undefined} stubStr
 * @returns {{ id: string, email: string, name: string, groups: string[] }|null}
 */
function parseDevStubUser(stubStr) {
  if (!stubStr) return null;
  const parts = stubStr.split(':');
  if (parts.length < 1) return null;
  const email = (parts[0] || '').trim().toLowerCase();
  if (!email) return null;
  const name = (parts[1] || email).trim();
  const groups = parts[2]
    ? parts[2].split(',').map(g => g.trim()).filter(Boolean)
    : [];
  return { id: email, email, name, groups };
}

/**
 * loadUser – Express middleware.
 *
 * Resolves the current principal from proxy-injected headers and attaches it
 * to `res.locals.user`. Logs `[auth] principal="<email>"` for every request.
 *
 * Never rejects – always falls back to GUEST_USER so downstream middleware
 * can decide what to do with unauthenticated requests.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function loadUser(req, res, next) {
  const rawEmail =
    (req.headers['remote-user'] || req.headers['remote-email'] || '').trim();

  if (rawEmail) {
    const email = rawEmail.toLowerCase();
    const name = (req.headers['remote-name'] || email).trim();
    const groupsHeader = (req.headers['remote-groups'] || '').trim();
    const groups = groupsHeader
      ? groupsHeader.split(',').map(g => g.trim()).filter(Boolean)
      : [];

    res.locals.user = { id: email, email, name, groups };
  } else {
    const isProduction = process.env.NODE_ENV === 'production';
    const requireProxyAuth = process.env.REQUIRE_PROXY_AUTH === 'true';

    if (!isProduction && !requireProxyAuth) {
      const stub = parseDevStubUser(process.env.DEV_STUB_USER);
      res.locals.user = stub || GUEST_USER;
    } else {
      res.locals.user = GUEST_USER;
    }
  }

  console.log(`[auth] principal="${res.locals.user.email}"`);
  next();
}

/**
 * requireAuth – Express middleware.
 *
 * Returns a 401 JSON response when the resolved user is the guest sentinel.
 * Apply this to routes that require authentication.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function requireAuth(req, res, next) {
  const user = res.locals.user;
  if (!user || user.id === GUEST_USER.id) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required. Provide a Remote-User header via the reverse proxy.',
    });
  }
  next();
}

/**
 * requireProxyAuth – strict-mode middleware.
 *
 * Returns 401 when `Remote-User` is absent AND the environment is production
 * (`NODE_ENV=production`) or `REQUIRE_PROXY_AUTH=true`.
 * In development (without `REQUIRE_PROXY_AUTH`), this is a no-op pass-through.
 *
 * Not registered globally by default – apply only to routes that need it.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function requireProxyAuth(req, res, next) {
  const isProduction = process.env.NODE_ENV === 'production';
  const strictMode = isProduction || process.env.REQUIRE_PROXY_AUTH === 'true';

  if (strictMode && !req.headers['remote-user']) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Request must be routed through the authenticated reverse proxy.',
    });
  }
  next();
}

/**
 * Returns the content-file path for a user, honouring MAGAZEEN_USER_SCOPED.
 *
 * When MAGAZEEN_USER_SCOPED=true the file is placed under a directory named
 * by the sha256 of the user's email so content stays isolated per user.
 * When unset (default) the single shared path is returned unchanged.
 *
 * @param {string} basePath  - e.g. 'out/magazine-content.json'
 * @param {{ email: string }} user
 * @returns {string}
 */
export function resolveContentPath(basePath, user) {
  if (process.env.MAGAZEEN_USER_SCOPED !== 'true') {
    return basePath;
  }
  if (!user || user.id === GUEST_USER.id) {
    return basePath;
  }
  const hash = crypto.createHash('sha256').update(user.email).digest('hex');
  // Replace the filename portion, keeping the directory and basename.
  const lastSlash = basePath.lastIndexOf('/');
  if (lastSlash === -1) {
    return `${hash}/${basePath}`;
  }
  const dir = basePath.slice(0, lastSlash);
  const file = basePath.slice(lastSlash + 1);
  return `${dir}/${hash}/${file}`;
}
