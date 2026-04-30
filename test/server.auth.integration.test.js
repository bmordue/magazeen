/**
 * Integration tests: auth middleware on an Express web server.
 *
 * These tests verify that:
 *   - protected routes return 401 when no identity headers are present
 *   - protected routes are accessible when Remote-User is provided
 *   - the GET / home route remains open (no auth required)
 *   - security headers are set on all responses
 *   - DEV_STUB_USER allows access in development mode
 *
 * Note: We build a minimal test Express app using just the auth middleware
 * rather than importing the full server.js to keep tests fast and isolated.
 */

import express from 'express';
import request from 'supertest';
import { loadUser, requireAuth, requireProxyAuth } from '../src/web/auth.js';

// ─── Test app factory ────────────────────────────────────────────────────────

function buildTestApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // Security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Resolve user from headers
  app.use(loadUser);

  // Open route
  app.get('/', (req, res) => {
    res.json({ ok: true, route: 'home' });
  });

  // Protected routes
  app.post('/upload', requireAuth, (req, res) => {
    res.json({ ok: true, user: res.locals.user.email });
  });

  app.post('/generate-epub', requireAuth, (req, res) => {
    res.json({ ok: true, user: res.locals.user.email });
  });

  // Strict proxy-auth route
  app.get('/strict', requireProxyAuth, (req, res) => {
    res.json({ ok: true });
  });

  return app;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Auth integration – protected endpoints', () => {
  let app;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NODE_ENV;
    delete process.env.DEV_STUB_USER;
    delete process.env.REQUIRE_PROXY_AUTH;
    app = buildTestApp();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ─── GET / ─────────────────────────────────────────────────────────────────

  describe('GET / (open route)', () => {
    it('returns 200 with no auth headers', async () => {
      const res = await request(app).get('/');
      expect(res.statusCode).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    it('returns 200 with Remote-User header', async () => {
      const res = await request(app)
        .get('/')
        .set('Remote-User', 'alice@example.com');
      expect(res.statusCode).toBe(200);
    });
  });

  // ─── POST /upload ───────────────────────────────────────────────────────────

  describe('POST /upload (protected route)', () => {
    it('returns 401 when no Remote-User header is present and no DEV_STUB_USER', async () => {
      const res = await request(app).post('/upload');
      expect(res.statusCode).toBe(401);
      expect(res.body).toMatchObject({ error: 'Unauthorized' });
    });

    it('returns 200 when Remote-User header is set', async () => {
      const res = await request(app)
        .post('/upload')
        .set('Remote-User', 'alice@example.com');
      expect(res.statusCode).toBe(200);
      expect(res.body.user).toBe('alice@example.com');
    });

    it('normalises email to lowercase', async () => {
      const res = await request(app)
        .post('/upload')
        .set('Remote-User', 'Alice@Example.COM');
      expect(res.statusCode).toBe(200);
      expect(res.body.user).toBe('alice@example.com');
    });

    it('falls back to Remote-Email when Remote-User is absent', async () => {
      const res = await request(app)
        .post('/upload')
        .set('Remote-Email', 'bob@example.com');
      expect(res.statusCode).toBe(200);
      expect(res.body.user).toBe('bob@example.com');
    });
  });

  // ─── POST /generate-epub ────────────────────────────────────────────────────

  describe('POST /generate-epub (protected route)', () => {
    it('returns 401 when no Remote-User header is present and no DEV_STUB_USER', async () => {
      const res = await request(app).post('/generate-epub');
      expect(res.statusCode).toBe(401);
      expect(res.body).toMatchObject({ error: 'Unauthorized' });
    });

    it('returns 200 when Remote-User header is set', async () => {
      const res = await request(app)
        .post('/generate-epub')
        .set('Remote-User', 'alice@example.com');
      expect(res.statusCode).toBe(200);
    });
  });

  // ─── DEV_STUB_USER ─────────────────────────────────────────────────────────

  describe('DEV_STUB_USER fallback (development)', () => {
    it('allows access to protected route via DEV_STUB_USER when NODE_ENV is not production', async () => {
      process.env.DEV_STUB_USER = 'dev@local:Dev User:devs';
      process.env.NODE_ENV = 'development';
      app = buildTestApp();

      const res = await request(app).post('/upload');
      expect(res.statusCode).toBe(200);
      expect(res.body.user).toBe('dev@local');
    });

    it('ignores DEV_STUB_USER and returns 401 when NODE_ENV=production', async () => {
      process.env.DEV_STUB_USER = 'dev@local:Dev User:devs';
      process.env.NODE_ENV = 'production';
      app = buildTestApp();

      const res = await request(app).post('/upload');
      expect(res.statusCode).toBe(401);
    });
  });

  // ─── requireProxyAuth ───────────────────────────────────────────────────────

  describe('requireProxyAuth strict mode', () => {
    it('returns 401 in production when Remote-User is absent', async () => {
      process.env.NODE_ENV = 'production';
      app = buildTestApp();

      const res = await request(app).get('/strict');
      expect(res.statusCode).toBe(401);
    });

    it('passes through in development when Remote-User is absent', async () => {
      process.env.NODE_ENV = 'development';
      app = buildTestApp();

      const res = await request(app).get('/strict');
      expect(res.statusCode).toBe(200);
    });

    it('passes through in production when Remote-User is present', async () => {
      process.env.NODE_ENV = 'production';
      app = buildTestApp();

      const res = await request(app)
        .get('/strict')
        .set('Remote-User', 'alice@example.com');
      expect(res.statusCode).toBe(200);
    });
  });

  // ─── Security headers ───────────────────────────────────────────────────────

  describe('Security headers', () => {
    it('sets X-Frame-Options: DENY', async () => {
      const res = await request(app).get('/');
      expect(res.headers['x-frame-options']).toBe('DENY');
    });

    it('sets X-Content-Type-Options: nosniff', async () => {
      const res = await request(app).get('/');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('sets Referrer-Policy: strict-origin-when-cross-origin', async () => {
      const res = await request(app).get('/');
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });

    it('does not expose X-Powered-By', async () => {
      const res = await request(app).get('/');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });
  });
});

