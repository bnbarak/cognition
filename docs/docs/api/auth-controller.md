# Auth Controller

**Service:** Core API (TypeScript / Express)
**Base path:** `/api/auth`
**Source:** `javascript/src/routes/auth.ts`

Handles user authentication and account management for the InsureCRM platform.

---

## Endpoints

### POST `/api/auth/login`

Authenticate an agency user with email and password.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string (email) | Yes | User's email address |
| `password` | string | Yes | User's password |

**Response (200):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token",
    "expiresIn": 3600
  }
}
```

**Errors:** `401 Unauthorized` — Invalid credentials

---

### POST `/api/auth/register`

Register a new user in the agency.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string (email) | Yes | New user's email |
| `password` | string | Yes | Password |
| `firstName` | string | Yes | First name |
| `lastName` | string | Yes | Last name |
| `agencyName` | string | Yes | Name of the insurance agency |
| `role` | string | Yes | One of: `admin`, `agent`, `viewer` |

**Response (201):** Returns the created user profile.

**Errors:** `409 Conflict` — Email already in use

---

### POST `/api/auth/refresh`

Refresh an expired access token using a valid refresh token.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `refreshToken` | string | Yes | A valid refresh token |

**Response (200):** Returns a new token pair.

**Errors:** `401 Unauthorized` — Invalid or expired refresh token

---

### POST `/api/auth/forgot-password`

Request a password reset email.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string (email) | Yes | Account email address |

**Response (200):** Confirmation that a reset email was sent.

**Errors:** `404 Not Found` — Email not registered

---

### POST `/api/auth/reset-password`

Reset a user's password using a token received via email.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | Yes | Password reset token from email |
| `newPassword` | string | Yes | The new password to set |

**Response (200):** Confirmation that the password was reset.

**Errors:** `400 Bad Request` — Invalid or expired token
