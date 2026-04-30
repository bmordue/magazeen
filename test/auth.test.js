/**
 * Unit tests for src/web/auth.js
 */

import { jest } from '@jest/globals';
import { loadUser, requireAuth, requireProxyAuth, GUEST_USER, resolveContentPath } from '../src/web/auth.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeReq(headers = {}) {
  return { headers };
}

function makeRes() {
  const res = { locals: {} };
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const noop = jest.fn();

// ─── loadUser ────────────────────────────────────────────────────────────────

describe('loadUser', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NODE_ENV;
    delete process.env.REQUIRE_PROXY_AUTH;
    delete process.env.DEV_STUB_USER;
    noop.mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('resolves user from Remote-User header', () => {
    const req = makeReq({ 'remote-user': 'alice@example.com', 'remote-name': 'Alice' });
    const res = makeRes();
    loadUser(req, res, noop);
    expect(res.locals.user).toMatchObject({ email: 'alice@example.com', name: 'Alice' });
    expect(noop).toHaveBeenCalledTimes(1);
  });

  it('falls back to Remote-Email when Remote-User is absent', () => {
    const req = makeReq({ 'remote-email': 'bob@example.com' });
    const res = makeRes();
    loadUser(req, res, noop);
    expect(res.locals.user.email).toBe('bob@example.com');
  });

  it('normalises email to lowercase', () => {
    const req = makeReq({ 'remote-user': '  Alice@Example.COM  ' });
    const res = makeRes();
    loadUser(req, res, noop);
    expect(res.locals.user.email).toBe('alice@example.com');
  });

  it('defaults name to email when Remote-Name is absent', () => {
    const req = makeReq({ 'remote-user': 'carol@example.com' });
    const res = makeRes();
    loadUser(req, res, noop);
    expect(res.locals.user.name).toBe('carol@example.com');
  });

  it('parses Remote-Groups as a comma-separated list', () => {
    const req = makeReq({
      'remote-user': 'dave@example.com',
      'remote-groups': 'admins,editors, readers ',
    });
    const res = makeRes();
    loadUser(req, res, noop);
    expect(res.locals.user.groups).toEqual(['admins', 'editors', 'readers']);
  });

  it('produces empty groups array when Remote-Groups is absent', () => {
    const req = makeReq({ 'remote-user': 'eve@example.com' });
    const res = makeRes();
    loadUser(req, res, noop);
    expect(res.locals.user.groups).toEqual([]);
  });

  it('uses DEV_STUB_USER in development when no headers are present', () => {
    process.env.DEV_STUB_USER = 'dev@local:Dev User:devs,testers';
    process.env.NODE_ENV = 'development';
    const req = makeReq({});
    const res = makeRes();
    loadUser(req, res, noop);
    expect(res.locals.user).toMatchObject({
      email: 'dev@local',
      name: 'Dev User',
      groups: ['devs', 'testers'],
    });
  });

  it('ignores DEV_STUB_USER in production', () => {
    process.env.DEV_STUB_USER = 'dev@local:Dev User:devs';
    process.env.NODE_ENV = 'production';
    const req = makeReq({});
    const res = makeRes();
    loadUser(req, res, noop);
    expect(res.locals.user).toMatchObject(GUEST_USER);
  });

  it('ignores DEV_STUB_USER when REQUIRE_PROXY_AUTH=true', () => {
    process.env.DEV_STUB_USER = 'dev@local:Dev User:devs';
    process.env.REQUIRE_PROXY_AUTH = 'true';
    const req = makeReq({});
    const res = makeRes();
    loadUser(req, res, noop);
    expect(res.locals.user).toMatchObject(GUEST_USER);
  });

  it('falls back to guest sentinel when no headers and no stub', () => {
    const req = makeReq({});
    const res = makeRes();
    loadUser(req, res, noop);
    expect(res.locals.user).toMatchObject(GUEST_USER);
  });
});

// ─── requireAuth ─────────────────────────────────────────────────────────────

describe('requireAuth', () => {
  it('calls next when user is authenticated', () => {
    const next = jest.fn();
    const req = makeReq({});
    const res = makeRes();
    res.locals.user = { id: 'alice@example.com', email: 'alice@example.com', name: 'Alice', groups: [] };
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 401 when user is the guest sentinel', () => {
    const next = jest.fn();
    const req = makeReq({});
    const res = makeRes();
    res.locals.user = GUEST_USER;
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when res.locals.user is not set', () => {
    const next = jest.fn();
    const req = makeReq({});
    const res = makeRes();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

// ─── requireProxyAuth ────────────────────────────────────────────────────────

describe('requireProxyAuth', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NODE_ENV;
    delete process.env.REQUIRE_PROXY_AUTH;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns 401 in production when Remote-User is absent', () => {
    const next = jest.fn();
    process.env.NODE_ENV = 'production';
    const req = makeReq({});
    const res = makeRes();
    requireProxyAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when REQUIRE_PROXY_AUTH=true and Remote-User is absent', () => {
    const next = jest.fn();
    process.env.REQUIRE_PROXY_AUTH = 'true';
    const req = makeReq({});
    const res = makeRes();
    requireProxyAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('passes through in development without REQUIRE_PROXY_AUTH', () => {
    const next = jest.fn();
    process.env.NODE_ENV = 'development';
    const req = makeReq({});
    const res = makeRes();
    requireProxyAuth(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('passes through in production when Remote-User is present', () => {
    const next = jest.fn();
    process.env.NODE_ENV = 'production';
    const req = makeReq({ 'remote-user': 'alice@example.com' });
    const res = makeRes();
    requireProxyAuth(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

// ─── resolveContentPath ───────────────────────────────────────────────────────

describe('resolveContentPath', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.MAGAZEEN_USER_SCOPED;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns basePath unchanged when MAGAZEEN_USER_SCOPED is not set', () => {
    const user = { id: 'alice@example.com', email: 'alice@example.com', name: 'Alice', groups: [] };
    const result = resolveContentPath('out/magazine-content.json', user);
    expect(result).toBe('out/magazine-content.json');
  });

  it('namespaces the path by sha256(email) when MAGAZEEN_USER_SCOPED=true', () => {
    process.env.MAGAZEEN_USER_SCOPED = 'true';
    const user = { id: 'alice@example.com', email: 'alice@example.com', name: 'Alice', groups: [] };
    const result = resolveContentPath('out/magazine-content.json', user);
    expect(result).toMatch(/^out\/[a-f0-9]{64}\/magazine-content\.json$/);
  });

  it('returns basePath for guest user even when MAGAZEEN_USER_SCOPED=true', () => {
    process.env.MAGAZEEN_USER_SCOPED = 'true';
    const result = resolveContentPath('out/magazine-content.json', GUEST_USER);
    expect(result).toBe('out/magazine-content.json');
  });
});
