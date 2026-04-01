# Clients Controller

**Service:** Core API (TypeScript / Express)
**Base path:** `/api/clients`
**Source:** `javascript/src/routes/clients.ts`

Manages client records and insurance policies within the InsureCRM system.

---

## Endpoints

### GET `/api/clients`

List all clients with pagination, search, and filtering.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page |
| `search` | string | — | Search by name, email, or phone |
| `assignedAgentId` | string | — | Filter by assigned agent |
| `tag` | string | — | Filter by tag |
| `sortBy` | string | — | One of: `firstName`, `lastName`, `createdAt`, `updatedAt` |
| `sortOrder` | string | — | `asc` or `desc` |

**Response (200):**

```json
{
  "clients": [ ... ],
  "total": 42,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

---

### GET `/api/clients/{clientId}`

Get a single client by ID, including all associated policies.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `clientId` | string | The client's unique ID |

**Response (200):** Full client record with policies.

**Errors:** `404 Not Found` — Client does not exist

---

### POST `/api/clients`

Create a new client record.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `firstName` | string | Yes | Client's first name |
| `lastName` | string | Yes | Client's last name |
| `email` | string (email) | Yes | Client's email |
| `phone` | string | Yes | Phone number |
| `address` | object | Yes | Address with `street`, `city`, `state`, `zip` |
| `dateOfBirth` | string (date) | Yes | Date of birth |
| `assignedAgentId` | string | Yes | Agent to assign this client to |
| `tags` | string[] | No | Tags for segmentation |
| `notes` | string | No | Free-text notes |

**Response (201):** The created client object.

**Errors:** `400 Bad Request` — Validation error

---

### PUT `/api/clients/{clientId}`

Update an existing client. All fields are optional — only provided fields are updated.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `clientId` | string | The client's unique ID |

**Request Body:** Same as POST, but all fields optional.

**Response (200):** The updated client object.

**Errors:** `404 Not Found` — Client does not exist

---

### DELETE `/api/clients/{clientId}`

Delete a client and all associated data.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `clientId` | string | The client's unique ID |

**Response (200):** Deletion confirmation.

**Errors:** `404 Not Found` — Client does not exist

---

### POST `/api/clients/{clientId}/policies`

Add a new insurance policy to a client.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `clientId` | string | The client's unique ID |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | One of: `auto`, `home`, `life`, `health`, `commercial` |
| `provider` | string | Yes | Insurance provider name |
| `policyNumber` | string | Yes | Policy number |
| `premiumAmount` | number | Yes | Annual premium in dollars |
| `startDate` | string (date) | Yes | Policy start date |
| `endDate` | string (date) | Yes | Policy end date |

**Response (201):** The created policy object.

**Errors:** `404 Not Found` — Client does not exist
