# Authentication Guide

InsureCRM uses **JWT-based authentication** with role-based access control (RBAC). All API requests (except login and register) must include a valid access token.

---

## Authentication Flow

```
1. User sends POST /api/auth/login with email + password
2. Server validates credentials against the user store
3. Server returns an access token (short-lived) and refresh token (long-lived)
4. Client stores both tokens (httpOnly cookie or secure storage)
5. Client sends access token in Authorization header for all subsequent requests
6. When access token expires, client sends refresh token to POST /api/auth/refresh
7. Server issues a new token pair
```

---

## Token Format

InsureCRM issues **JSON Web Tokens (JWT)** signed with HS256.

### Access Token

| Property | Value |
|----------|-------|
| **Algorithm** | HS256 |
| **Lifetime** | 3600 seconds (1 hour) |
| **Issuer** | `insurecrm-core-api` |
| **Audience** | `insurecrm-client` |

**Example decoded payload:**

```json
{
  "sub": "usr_a1b2c3d4",
  "email": "sarah.thompson@brightwayinsurance.com",
  "role": "agent",
  "agencyId": "agency_9f8e7d6c",
  "firstName": "Sarah",
  "lastName": "Thompson",
  "iat": 1718460600,
  "exp": 1718464200,
  "iss": "insurecrm-core-api",
  "aud": "insurecrm-client"
}
```

### Refresh Token

| Property | Value |
|----------|-------|
| **Algorithm** | HS256 |
| **Lifetime** | 30 days |
| **Rotation** | Each refresh issues a new refresh token and invalidates the old one |
| **Storage** | Server-side allowlist; revoked on logout |

**Example decoded payload:**

```json
{
  "sub": "usr_a1b2c3d4",
  "type": "refresh",
  "jti": "rtk_x7y8z9w0",
  "iat": 1718460600,
  "exp": 1721052600,
  "iss": "insurecrm-core-api"
}
```

---

## Using Tokens

Include the access token in every API request:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfYTFiMmMzZDQiLCJlbWFpbCI6InNhcmFoLnRob21wc29uQGJyaWdodHdheWluc3VyYW5jZS5jb20iLCJyb2xlIjoiYWdlbnQiLCJhZ2VuY3lJZCI6ImFnZW5jeV85ZjhlN2Q2YyIsImlhdCI6MTcxODQ2MDYwMCwiZXhwIjoxNzE4NDY0MjAwfQ.fake_signature_here
```

If the server returns `401 Unauthorized` with `"code": "TOKEN_EXPIRED"`, use the refresh endpoint to obtain a new token pair before retrying.

---

## Roles & Permissions

InsureCRM defines three roles. Every user belongs to exactly one agency and has exactly one role.

### Admin

Full control over the agency account.

| Resource | Create | Read | Update | Delete |
|----------|--------|------|--------|--------|
| Users | Yes | Yes | Yes | Yes |
| Clients | Yes | Yes | Yes | Yes |
| Policies | Yes | Yes | Yes | Yes |
| Emails (send) | Yes | Yes | — | — |
| Emails (inbox) | — | Yes | Yes | Yes |
| Agency settings | — | Yes | Yes | — |

### Agent

Manages their own book of business.

| Resource | Create | Read | Update | Delete |
|----------|--------|------|--------|--------|
| Users | No | Own profile | Own profile | No |
| Clients | Yes | Assigned only | Assigned only | No |
| Policies | Yes | Assigned clients | Assigned clients | No |
| Emails (send) | Yes | Own sent | — | — |
| Emails (inbox) | — | Assigned clients | Yes | No |
| Agency settings | — | No | No | — |

### Viewer

Read-only access for auditing and reporting.

| Resource | Create | Read | Update | Delete |
|----------|--------|------|--------|--------|
| Users | No | Own profile | No | No |
| Clients | No | All | No | No |
| Policies | No | All | No | No |
| Emails (send) | No | All | — | — |
| Emails (inbox) | — | All | No | No |
| Agency settings | — | Yes | No | — |

---

## Password Policy

| Rule | Value |
|------|-------|
| Minimum length | 8 characters |
| Requires uppercase | Yes |
| Requires lowercase | Yes |
| Requires digit | Yes |
| Requires special character | Yes (`!@#$%^&*`) |
| Max failed attempts before lockout | 5 |
| Lockout duration | 15 minutes |
| Password history | Last 5 passwords cannot be reused |

---

## Password Reset Flow

```
1. User sends POST /api/auth/forgot-password with email
2. Server generates a one-time reset token (expires in 1 hour)
3. Server sends reset link to the user's email via the Email Service
4. User clicks link and sends POST /api/auth/reset-password with token + new password
5. Server validates token, updates password, and invalidates all existing sessions
```

The reset token is a 64-character hex string stored as a SHA-256 hash in the database.

---

## Test Credentials

Use these credentials in development and staging environments:

| Email | Password | Role | Agency |
|-------|----------|------|--------|
| `admin@demo-agency.insurecrm.dev` | `Admin123!` | admin | Demo Agency |
| `sarah.thompson@demo-agency.insurecrm.dev` | `Agent456!` | agent | Demo Agency |
| `viewer@demo-agency.insurecrm.dev` | `View789!` | viewer | Demo Agency |

---

## Error Responses

All authentication errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "The email or password you entered is incorrect."
  }
}
```

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `TOKEN_EXPIRED` | 401 | Access token has expired |
| `TOKEN_INVALID` | 401 | Token is malformed or signature is invalid |
| `REFRESH_TOKEN_REVOKED` | 401 | Refresh token was revoked (e.g. by logout) |
| `ACCOUNT_LOCKED` | 423 | Too many failed login attempts |
| `INSUFFICIENT_PERMISSIONS` | 403 | User's role lacks permission for this action |
| `EMAIL_ALREADY_EXISTS` | 409 | Email is already registered |
| `WEAK_PASSWORD` | 400 | Password does not meet policy requirements |
| `RESET_TOKEN_EXPIRED` | 400 | Password reset token has expired |
