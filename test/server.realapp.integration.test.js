/**
 * Smoke tests against the real src/server.js Express app.
 *
 * Verifies that:
 *   - Auth middleware is wired: /upload and /generate-epub return 401 without identity headers
 *   - Security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy) are present
 *   - x-powered-by is suppressed
 *   - GET / (open route) remains accessible without auth
 */

import { jest } from '@jest/globals';
import request from 'supertest';

// ─── Mocks needed by server.js ────────────────────────────────────────────────

jest.unstable_mockModule('@vercel/kv', () => ({
  kv: {
    get: jest.fn(),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.unstable_mockModule('fs/promises', () => ({
  readFile: jest.fn(),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('../src/contentManager.js', () => ({
  ContentManager: jest.fn().mockImplementation(() => ({ addChatHighlight: jest.fn() })),
}));

jest.unstable_mockModule('../src/articleGenerator.js', () => ({
  ArticleGenerator: jest.fn(),
}));

jest.unstable_mockModule('../src/magazineGenerator.js', () => ({
  MagazineGenerator: jest.fn().mockImplementation(() => ({
    generateMagazine: jest.fn().mockResolvedValue('/tmp/out/magazine-test.epub'),
  })),
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Real server.js – auth and security headers', () => {
  let app;
  const originalEnv = process.env;

  beforeAll(async () => {
    process.env = { ...originalEnv, NODE_ENV: 'test' };
    delete process.env.DEV_STUB_USER;
    delete process.env.REQUIRE_PROXY_AUTH;
    const mod = await import('../src/server.js');
    app = mod.default;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // ─── Open route ───────────────────────────────────────────────────────────

  it('GET / returns 200 without auth headers', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('Upload Chat Export');
  });

  // ─── Protected routes return 401 without identity headers ─────────────────

  it('POST /upload returns 401 without Remote-User and no DEV_STUB_USER', async () => {
    const res = await request(app).post('/upload');
    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ error: 'Unauthorized' });
  });

  it('POST /generate-epub returns 401 without Remote-User and no DEV_STUB_USER', async () => {
    const res = await request(app)
      .post('/generate-epub')
      .send('selectedChats=c1&sessionId=fake-session');
    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ error: 'Unauthorized' });
  });

  // ─── Protected route is accessible with Remote-User ──────────────────────

  it('POST /upload returns 400 (not 401) when Remote-User is set but no file', async () => {
    const res = await request(app)
      .post('/upload')
      .set('Remote-User', 'alice@example.com');
    expect(res.statusCode).toBe(400);
    expect(res.text).toContain('No file uploaded');
  });

  // ─── Security headers ─────────────────────────────────────────────────────

  it('sets X-Frame-Options: DENY on all responses', async () => {
    const res = await request(app).get('/');
    expect(res.headers['x-frame-options']).toBe('DENY');
  });

  it('sets X-Content-Type-Options: nosniff on all responses', async () => {
    const res = await request(app).get('/');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('sets Referrer-Policy on all responses', async () => {
    const res = await request(app).get('/');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  it('does not expose X-Powered-By', async () => {
    const res = await request(app).get('/');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
