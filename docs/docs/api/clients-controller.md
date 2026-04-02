# Clients Controller

**Service:** Core API (TypeScript / Express)
**Base path:** `/api/clients`
**Source:** `javascript/src/routes/clients.ts`
**Auth required:** Yes (all endpoints)
**Roles:** Admin (full access), Agent (assigned clients only), Viewer (read-only)

Manages client records and insurance policies. Agents can only access clients assigned to them. Admins see all clients in the agency.

---

## Endpoints

### GET `/api/clients`

List all clients with pagination, search, and filtering. Agents only see their assigned clients.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page (max 100) |
| `search` | string | — | Search by name, email, or phone |
| `assignedAgentId` | string | — | Filter by assigned agent |
| `tag` | string | — | Filter by tag |
| `sortBy` | string | `createdAt` | One of: `firstName`, `lastName`, `createdAt`, `updatedAt` |
| `sortOrder` | string | `desc` | `asc` or `desc` |

**Example:** `GET /api/clients?search=martinez&tag=high-value&limit=10`

**Response (200):**

```json
{
  "clients": [
    {
      "id": "cli_001",
      "firstName": "Maria",
      "lastName": "Martinez",
      "email": "maria.martinez@gmail.com",
      "phone": "(555) 234-5678",
      "address": {
        "street": "742 Evergreen Terrace",
        "city": "Austin",
        "state": "TX",
        "zip": "78701"
      },
      "dateOfBirth": "1985-03-12",
      "assignedAgentId": "usr_a1b2c3d4",
      "tags": ["high-value", "renewal-q4"],
      "notes": "Prefers email communication. Interested in bundling auto + home.",
      "policiesCount": 3,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-06-10T08:15:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

---

### GET `/api/clients/{clientId}`

Get a single client by ID, including all associated policies.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `clientId` | string | The client's unique ID (e.g. `cli_001`) |

**Response (200):**

```json
{
  "id": "cli_001",
  "firstName": "Maria",
  "lastName": "Martinez",
  "email": "maria.martinez@gmail.com",
  "phone": "(555) 234-5678",
  "address": {
    "street": "742 Evergreen Terrace",
    "city": "Austin",
    "state": "TX",
    "zip": "78701"
  },
  "dateOfBirth": "1985-03-12",
  "assignedAgentId": "usr_a1b2c3d4",
  "tags": ["high-value", "renewal-q4"],
  "notes": "Prefers email communication. Interested in bundling auto + home.",
  "policies": [
    {
      "id": "pol_101",
      "type": "auto",
      "provider": "State Farm",
      "policyNumber": "SF-2024-78901",
      "premiumAmount": 1850.00,
      "startDate": "2024-01-01",
      "endDate": "2025-01-01",
      "status": "active"
    },
    {
      "id": "pol_102",
      "type": "home",
      "provider": "Allstate",
      "policyNumber": "AS-2024-45678",
      "premiumAmount": 2400.00,
      "startDate": "2024-03-15",
      "endDate": "2025-03-15",
      "status": "active"
    }
  ],
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-06-10T08:15:00Z"
}
```

**Errors:**

| Status | Code | Description |
|--------|------|-------------|
| 404 | `CLIENT_NOT_FOUND` | Client does not exist |
| 403 | `INSUFFICIENT_PERMISSIONS` | Agent trying to access unassigned client |

---

### POST `/api/clients`

Create a new client record. The client is assigned to the specified agent.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `firstName` | string | Yes | Client's first name |
| `lastName` | string | Yes | Client's last name |
| `email` | string (email) | Yes | Client's email |
| `phone` | string | Yes | Phone number (any format) |
| `address` | object | Yes | Object with `street`, `city`, `state`, `zip` |
| `dateOfBirth` | string (date) | Yes | ISO 8601 date (`YYYY-MM-DD`) |
| `assignedAgentId` | string | Yes | Agent user ID to assign this client to |
| `tags` | string[] | No | Tags for segmentation |
| `notes` | string | No | Free-text notes (max 2000 chars) |

**Example request:**

```json
{
  "firstName": "James",
  "lastName": "O'Brien",
  "email": "james.obrien@outlook.com",
  "phone": "(555) 987-6543",
  "address": {
    "street": "1200 Congress Ave, Apt 4B",
    "city": "Austin",
    "state": "TX",
    "zip": "78701"
  },
  "dateOfBirth": "1978-11-22",
  "assignedAgentId": "usr_a1b2c3d4",
  "tags": ["commercial", "new-lead"],
  "notes": "Referred by Maria Martinez. Needs commercial liability for restaurant."
}
```

**Response (201):** The created client object (same shape as GET response, with empty `policies` array).

**Errors:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | `VALIDATION_ERROR` | Missing required fields or invalid format |
| 403 | `INSUFFICIENT_PERMISSIONS` | Viewer role cannot create clients |

---

### PUT `/api/clients/{clientId}`

Update an existing client. Only provided fields are updated (partial update).

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `clientId` | string | The client's unique ID |

**Request Body:** Same fields as POST, but all are optional.

**Example request:**

```json
{
  "tags": ["commercial", "new-lead", "restaurant"],
  "notes": "Referred by Maria Martinez. Needs commercial liability for restaurant. Meeting scheduled for July 1."
}
```

**Response (200):** The updated client object.

**Errors:**

| Status | Code | Description |
|--------|------|-------------|
| 404 | `CLIENT_NOT_FOUND` | Client does not exist |
| 403 | `INSUFFICIENT_PERMISSIONS` | Agent can only update assigned clients; Viewer cannot update |

---

### DELETE `/api/clients/{clientId}`

Delete a client and all associated policies, sent emails, and linked received emails. This action is irreversible. Only `admin` users can delete clients.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `clientId` | string | The client's unique ID |

**Response (200):**

```json
{
  "success": true,
  "message": "Client cli_001 and all associated data have been deleted.",
  "deletedPolicies": 3,
  "deletedEmails": 12
}
```

**Errors:**

| Status | Code | Description |
|--------|------|-------------|
| 404 | `CLIENT_NOT_FOUND` | Client does not exist |
| 403 | `INSUFFICIENT_PERMISSIONS` | Only admin can delete clients |

---

### PATCH `/api/clients/{clientId}/tags`

Bulk update tags on a client. Add or remove multiple tags in a single request. Tags are used for client segmentation (e.g. `high-value`, `renewal-q4`, `commercial`).

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `clientId` | string | The client's unique ID |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `add` | string[] | No | Tags to add to the client |
| `remove` | string[] | No | Tags to remove from the client |

**Example request:**

```json
{
  "add": ["commercial", "priority"],
  "remove": ["new-lead"]
}
```

**Response (200):**

```json
{
  "clientId": "cli_001",
  "tags": ["vip", "renewal-due", "commercial", "priority"],
  "added": ["commercial", "priority"],
  "removed": ["new-lead"],
  "message": "Tags updated successfully"
}
```

**Errors:**

| Status | Code | Description |
|--------|------|-------------|
| 404 | `CLIENT_NOT_FOUND` | Client does not exist |
| 403 | `INSUFFICIENT_PERMISSIONS` | Viewer role cannot modify tags |

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
| `provider` | string | Yes | Insurance carrier name |
| `policyNumber` | string | Yes | Policy number from the carrier |
| `premiumAmount` | number | Yes | Annual premium in USD |
| `startDate` | string (date) | Yes | Policy effective date (`YYYY-MM-DD`) |
| `endDate` | string (date) | Yes | Policy expiration date (`YYYY-MM-DD`) |

**Example request:**

```json
{
  "type": "commercial",
  "provider": "Hartford",
  "policyNumber": "HF-2024-COM-33219",
  "premiumAmount": 4200.00,
  "startDate": "2024-07-01",
  "endDate": "2025-07-01"
}
```

**Response (201):**

```json
{
  "id": "pol_201",
  "type": "commercial",
  "provider": "Hartford",
  "policyNumber": "HF-2024-COM-33219",
  "premiumAmount": 4200.00,
  "startDate": "2024-07-01",
  "endDate": "2025-07-01",
  "status": "active",
  "clientId": "cli_002",
  "createdAt": "2024-06-15T14:30:00Z"
}
```

**Errors:**

| Status | Code | Description |
|--------|------|-------------|
| 404 | `CLIENT_NOT_FOUND` | Client does not exist |
| 400 | `VALIDATION_ERROR` | Missing required fields or `endDate` before `startDate` |
