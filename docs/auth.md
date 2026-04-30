# Authentication Model

Magazeen's web server is **auth-agnostic**: it never handles credentials, passwords, sessions, or tokens directly. Authentication is delegated entirely to an upstream reverse proxy (nginx + Authelia or oauth2-proxy), which injects signed identity headers into every request.

```
Browser ──► nginx (443) ──► Authelia auth_request ──► magazeen (127.0.0.1:3000)
                                 │
                           OIDC / LDAP
```

---

## Identity Headers

The proxy **must** strip these headers from untrusted clients and then re-inject them after successful authentication.

| Header          | Description                                 | Example                    |
|-----------------|---------------------------------------------|----------------------------|
| `Remote-User`   | Authenticated user's email (preferred)      | `alice@example.com`        |
| `Remote-Email`  | Fallback email identity header              | `alice@example.com`        |
| `Remote-Name`   | Display name (defaults to email if absent)  | `Alice Smith`              |
| `Remote-Groups` | Comma-separated list of groups              | `admins,editors`           |

### Resolution order

1. `Remote-User` — preferred; set directly by Authelia/oauth2-proxy.
2. `Remote-Email` — fallback identity header used when `Remote-User` is absent.
3. `DEV_STUB_USER` env var — development-only; ignored in production.
4. Guest sentinel `{ id: 'guest', email: 'guest@local', ... }` — unauthenticated fallback.

Emails are always normalised to **lowercase and trimmed**.

---

## Environment Variables

| Variable               | Default       | Purpose                                                          |
|------------------------|---------------|------------------------------------------------------------------|
| `NODE_ENV`             | `development` | Controls `127.0.0.1` binding and dev-stub gating                |
| `REQUIRE_PROXY_AUTH`   | (unset)       | When `true`, disables `DEV_STUB_USER` and enables strict mode   |
| `DEV_STUB_USER`        | (unset)       | Dev-only fake identity (`email:Display Name:group1,group2`)      |
| `ADMIN_GROUP`          | `admins`      | Group name granting admin privileges (reserved for future use)   |
| `MAGAZEEN_USER_SCOPED` | (unset)       | When `true`, namespace content files by sha256(email)            |
| `PORT`                 | `3000`        | Existing port variable, keep as-is                               |

---

## Middleware Reference (`src/web/auth.js`)

### `loadUser(req, res, next)`

Registered globally before all route handlers. Resolves the current principal and stores it on `res.locals.user`. Logs `[auth] principal="<email>"` once per request for auditing.

### `requireAuth(req, res, next)`

Returns `401 JSON` when `res.locals.user` is the guest sentinel. Apply to upload and write endpoints.

### `requireProxyAuth(req, res, next)`

Strict-mode middleware. Returns `401` when `Remote-User` is absent **and** `NODE_ENV=production` or `REQUIRE_PROXY_AUTH=true`. Pass-through in development. Not registered globally — apply selectively.

---

## nginx Configuration Example

```nginx
upstream magazeen {
  server 127.0.0.1:3000;
}

server {
  listen 443 ssl http2;
  server_name magazeen.example.com;

  # ── Strip untrusted client-supplied identity headers ──────────────────
  proxy_set_header Remote-User   "";
  proxy_set_header Remote-Email  "";
  proxy_set_header Remote-Name   "";
  proxy_set_header Remote-Groups "";

  location / {
    # ── Authelia auth_request ──────────────────────────────────────────
    auth_request /auth;
    auth_request_set $user   $upstream_http_remote_user;
    auth_request_set $email  $upstream_http_remote_email;
    auth_request_set $name   $upstream_http_remote_name;
    auth_request_set $groups $upstream_http_remote_groups;

    # Inject verified identity headers into the proxied request
    proxy_set_header Remote-User   $user;
    proxy_set_header Remote-Email  $email;
    proxy_set_header Remote-Name   $name;
    proxy_set_header Remote-Groups $groups;

    proxy_pass http://magazeen;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /auth {
    internal;
    proxy_pass http://authelia/api/verify;
    proxy_pass_request_body off;
    proxy_set_header Content-Length "";
    proxy_set_header X-Original-URL $scheme://$host$request_uri;
  }

  location = /authelia {
    proxy_pass http://authelia;
  }
}
```

---

## Authelia Access-Control Rules Example

```yaml
access_control:
  default_policy: deny
  rules:
    - domain: magazeen.example.com
      policy: one_factor
      subject: "group:magazeen-users"
```

---

## oauth2-proxy Notes

If you prefer oauth2-proxy instead of Authelia, configure it to set the same headers:

```ini
# oauth2-proxy config
set-xauthrequest = true
pass-user-headers = true
# oauth2-proxy injects X-Auth-Request-User and X-Auth-Request-Email;
# map these to Remote-User and Remote-Email in nginx:
#   proxy_set_header Remote-User  $upstream_http_x_auth_request_user;
#   proxy_set_header Remote-Email $upstream_http_x_auth_request_email;
```

---

## Per-User Content Scoping

By default, all users share a single content file (`out/magazine-content.json`). When you need per-user isolation, set `MAGAZEEN_USER_SCOPED=true`:

```bash
MAGAZEEN_USER_SCOPED=true npm run start:web
```

Content files are then stored at `out/<sha256(email)>/magazine-content.json`. The hash prevents PII leaking into directory names while maintaining a stable path per user.

---

## Local Development

Use `DEV_STUB_USER` to exercise the web server without a real proxy:

```bash
# Format: "email:Display Name:group1,group2"
DEV_STUB_USER="alice@example.com:Alice Smith:admins,editors" npm run start:web
```

The stub is **only** honoured when both:
- `NODE_ENV` is **not** `production`, **and**
- `REQUIRE_PROXY_AUTH` is **not** `true`.

Example curl commands:

```bash
# Open route (no auth required)
curl http://localhost:3000/

# Protected upload with Remote-User header (simulates proxy)
curl -X POST http://localhost:3000/upload \
  -H "Remote-User: alice@example.com" \
  -H "Remote-Name: Alice Smith" \
  -F "chatExport=@/path/to/export.json"

# Without proxy and with DEV_STUB_USER already set in the environment
curl -X POST http://localhost:3000/upload \
  -F "chatExport=@/path/to/export.json"
```

---

## Production Checklist

- [ ] nginx configured to **strip** `Remote-*` headers from untrusted clients.
- [ ] Authelia or oauth2-proxy sits between the internet and magazeen.
- [ ] `NODE_ENV=production` is set so `DEV_STUB_USER` is ignored and the server binds to `127.0.0.1` only.
- [ ] `REQUIRE_PROXY_AUTH=true` is set to enable strict proxy-auth enforcement.
- [ ] All access logs include the `[auth] principal="..."` line for audit trails.
- [ ] SSL/TLS is terminated at the nginx layer — magazeen never sees raw TLS.

---

## Threat Model

| Threat                                      | Mitigation                                                          |
|---------------------------------------------|---------------------------------------------------------------------|
| Client spoofs `Remote-User` header          | nginx strips all `Remote-*` headers from client requests            |
| Unauthenticated access to protected routes  | `requireAuth` returns 401 for guest sentinel users                  |
| Token or credential exposure                | magazeen never handles credentials; only email and group metadata   |
| PII in directory names (user scoping)       | sha256 hash used for directory names, not raw email                 |
| Clickjacking                                | `X-Frame-Options: DENY` set on all responses                        |
| MIME sniffing                               | `X-Content-Type-Options: nosniff` set on all responses              |
| Information leakage via `X-Powered-By`     | `app.disable('x-powered-by')` removes the Express signature         |
