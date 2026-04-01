# Auth Controller

**Service:** Core API (TypeScript / Express)
**Base path:** `/api/auth`
**Source:** `javascript/src/routes/auth.ts`
**Auth required:** No (login, forgot-password) | Yes (register — admin only, refresh, reset-password)

Handles user authentication and account management. See the [Authentication Guide](../authentication.md) for JWT details, roles, and test credentials.

---

## Endpoints

### POST `/api/auth/login`

Authenticate an agency user with email and password. Returns a JWT token pair.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string (email) | Yes | User's email address |
| `password` | string | Yes | User's password |

**Example request:**

```json
{
  "email": "sarah.thompson@demo-agency.insurecrm.dev",
  "password": "Agent456!"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfYTFiMmMzZDQiLCJlbWFpbCI6InNhcmFoLnRob21wc29uQGRlbW8tYWdlbmN5Lmluc3VyZWNybS5kZXYiLCJyb2xlIjoiYWdlbnQiLCJhZ2VuY3lJZCI6ImFnZW5jeV85ZjhlN2Q2YyIsImZpcnN0TmFtZSI6IlNhcmFoIiwibGFzdE5hbWUiOiJUaG9tcHNvbiIsImlhdCI6MTcxODQ2MDYwMCwiZXhwIjoxNzE4NDY0MjAwfQ.abc123",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfYTFiMmMzZDQiLCJ0eXBlIjoicmVmcmVzaCIsImp0aSI6InJ0a194N3k4ejl3MCIsImlhdCI6MTcxODQ2MDYwMCwiZXhwIjoxNzIxMDUyNjAwfQ.def456",
    "expiresIn": 3600,
    "user": {
      "id": "usr_a1b2c3d4",
      "email": "sarah.thompson@demo-agency.insurecrm.dev",
      "firstName": "Sarah",
      "lastName": "Thompson",
      "role": "agent",
      "agencyId": "agency_9f8e7d6c"
    }
  }
}
```

**Errors:**

| Status | Code | Description |
|--------|------|-------------|
| 401 | `INVALID_CREDENTIALS` | Wrong email or password |
| 423 | `ACCOUNT_LOCKED` | Too many failed attempts (5+); locked for 15 min |

---

### POST `/api/auth/register`

Register a new user in the agency. Only `admin` users can register new accounts.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string (email) | Yes | New user's email |
| `password` | string | Yes | Must meet [password policy](../authentication.md#password-policy) |
| `firstName` | string | Yes | First name |
| `lastName` | string | Yes | Last name |
| `agencyName` | string | Yes | Name of the insurance agency |
| `role` | string | Yes | One of: `admin`, `agent`, `viewer` |

**Example request:**

```json
{
  "email": "mike.chen@brightwayinsurance.com",
  "password": "Secure!Pass1",
  "firstName": "Mike",
  "lastName": "Chen",
  "agencyName": "Brightway Insurance Partners",
  "role": "agent"
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": "usr_e5f6g7h8",
    "email": "mike.chen@brightwayinsurance.com",
    "firstName": "Mike",
    "lastName": "Chen",
    "role": "agent",
    "agencyId": "agency_9f8e7d6c",
    "createdAt": "2024-06-15T14:30:00Z"
  }
}
```

**Errors:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | `WEAK_PASSWORD` | Password does not meet policy |
| 409 | `EMAIL_ALREADY_EXISTS` | Email is already registered |

---

### POST `/api/auth/refresh`

Refresh an expired access token. The old refresh token is invalidated and a new pair is issued.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `refreshToken` | string | Yes | A valid refresh token |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...(new token)",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...(new refresh token)",
    "expiresIn": 3600
  }
}
```

**Errors:**

| Status | Code | Description |
|--------|------|-------------|
| 401 | `TOKEN_INVALID` | Refresh token is malformed |
| 401 | `REFRESH_TOKEN_REVOKED` | Token was revoked (e.g. by logout or password change) |

---

### POST `/api/auth/forgot-password`

Request a password reset email. Always returns 200 even if the email is not registered (to prevent user enumeration).

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string (email) | Yes | Account email address |

**Response (200):**

```json
{
  "success": true,
  "message": "If an account with that email exists, a reset link has been sent."
}
```

---

### POST `/api/auth/reset-password`

Reset a user's password using a token received via email. Invalidates all existing sessions for the user.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | Yes | 64-character hex token from the reset email |
| `newPassword` | string | Yes | Must meet [password policy](../authentication.md#password-policy) |

**Example request:**

```json
{
  "token": "a3f8c91d2b4e6f0a1c3d5e7f9b2d4f6a8c0e2f4a6b8d0e2f4a6b8d0e2f4a6b",
  "newPassword": "NewSecure!Pass2"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Password has been reset. Please log in with your new password."
}
```

**Errors:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | `RESET_TOKEN_EXPIRED` | Token has expired (1 hour lifetime) |
| 400 | `WEAK_PASSWORD` | New password does not meet policy |
