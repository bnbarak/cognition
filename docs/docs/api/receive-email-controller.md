# Receive Email Controller

**Service:** Email Service (Java / Spring Boot)
**Base path:** `/api/emails/inbox`
**Source:** `java/src/main/java/com/insurecrm/email/controller/ReceiveEmailController.java`

Manages inbound emails from clients, insurance carriers, and other external parties. Provides listing, reading, client-linking, and deletion.

---

## Endpoints

### GET `/api/emails/inbox`

List received emails with pagination and filtering.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page |
| `unreadOnly` | boolean | — | Only show unread emails |
| `clientId` | string | — | Filter by matched client |
| `tag` | string | — | Filter by tag |

**Response (200):**

```json
{
  "emails": [ ... ],
  "total": 15,
  "page": 1,
  "limit": 20,
  "totalPages": 1,
  "unreadCount": 3
}
```

---

### GET `/api/emails/inbox/{emailId}`

Retrieve the full content of a received email. Automatically marks the email as read.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `emailId` | string | The received email's unique ID |

**Response (200):**

```json
{
  "id": "recv_001",
  "from": "jane.smith@example.com",
  "to": ["agent@insurecrm.com"],
  "subject": "Question about my auto policy",
  "body": "Hi, I'd like to know when my auto policy renews. Thanks!",
  "contentType": "text/plain",
  "receivedAt": "2024-06-14T09:15:00Z",
  "read": true,
  "matchedClientId": "cli_001",
  "tags": ["auto-policy", "inquiry"]
}
```

---

### PATCH `/api/emails/inbox/{emailId}/read`

Toggle the read/unread status of a received email.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `emailId` | string | The received email's unique ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `read` | boolean | Yes | `true` to mark as read, `false` to mark as unread |

**Response (200):** Confirmation with updated read status.

---

### POST `/api/emails/inbox/{emailId}/link`

Manually link a received email to a CRM client record. Use this when the automatic client matching did not find the correct client.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `emailId` | string | The received email's unique ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `clientId` | string | Yes | The client ID to link this email to |

**Response (200):** Confirmation with email and client IDs.

---

### DELETE `/api/emails/inbox/{emailId}`

Permanently delete a received email from the CRM inbox.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `emailId` | string | The received email's unique ID |

**Response (200):** Deletion confirmation.
