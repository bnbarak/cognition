# Receive Email Controller

**Service:** Email Service (Java / Spring Boot)
**Base path:** `/api/emails/inbox`
**Source:** `java/src/main/java/com/insurecrm/email/controller/ReceiveEmailController.java`
**Auth required:** Yes (all endpoints)
**Roles:** Admin (full access), Agent (assigned clients only), Viewer (read-only)

Manages inbound emails from clients, insurance carriers, and other external parties. Emails are automatically matched to CRM client records by sender address. Unmatched emails can be linked manually.

---

## Endpoints

### GET `/api/emails/inbox`

List received emails with pagination and filtering. Agents only see emails matched to their assigned clients.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page (max 100) |
| `unreadOnly` | boolean | false | Only show unread emails |
| `clientId` | string | — | Filter by matched client |
| `tag` | string | — | Filter by tag (e.g. `claim`, `inquiry`, `urgent`) |

**Example:** `GET /api/emails/inbox?unreadOnly=true&tag=urgent`

**Response (200):**

```json
{
  "emails": [
    {
      "id": "recv_003",
      "from": "maria.martinez@gmail.com",
      "subject": "URGENT: Accident report for auto policy",
      "receivedAt": "2024-06-15T08:45:00Z",
      "read": false,
      "matchedClientId": "cli_001",
      "matchedClientName": "Maria Martinez",
      "tags": ["urgent", "claim", "auto-policy"],
      "preview": "Hi Sarah, I was involved in a fender bender this morning..."
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "totalPages": 1,
  "unreadCount": 1
}
```

---

### GET `/api/emails/inbox/{emailId}`

Retrieve the full content of a received email. Automatically marks the email as read on first access.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `emailId` | string | The received email's unique ID (e.g. `recv_003`) |

**Response (200):**

```json
{
  "id": "recv_003",
  "from": "maria.martinez@gmail.com",
  "to": ["sarah.thompson@brightwayinsurance.com"],
  "subject": "URGENT: Accident report for auto policy",
  "body": "Hi Sarah,\n\nI was involved in a fender bender this morning on I-35. No injuries, but my bumper is damaged. My policy number is SF-2024-78901.\n\nCan you help me file a claim? I have photos of the damage.\n\nThanks,\nMaria",
  "contentType": "text/plain",
  "receivedAt": "2024-06-15T08:45:00Z",
  "read": true,
  "matchedClientId": "cli_001",
  "matchedClientName": "Maria Martinez",
  "tags": ["urgent", "claim", "auto-policy"],
  "headers": {
    "message-id": "<CAB1234@mail.gmail.com>",
    "in-reply-to": null
  }
}
```

**Errors:**

| Status | Code | Description |
|--------|------|-------------|
| 404 | `EMAIL_NOT_FOUND` | No email with that ID |
| 403 | `INSUFFICIENT_PERMISSIONS` | Agent accessing email not linked to their client |

---

### PATCH `/api/emails/inbox/{emailId}/read`

Toggle the read/unread status of a received email. Useful for marking emails as unread to revisit later.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `emailId` | string | The received email's unique ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `read` | boolean | Yes | `true` to mark as read, `false` to mark as unread |

**Example:** `PATCH /api/emails/inbox/recv_003/read?read=false`

**Response (200):**

```json
{
  "success": true,
  "emailId": "recv_003",
  "read": false,
  "message": "Email marked as unread"
}
```

**Errors:**

| Status | Code | Description |
|--------|------|-------------|
| 404 | `EMAIL_NOT_FOUND` | No email with that ID |

---

### POST `/api/emails/inbox/{emailId}/link`

Manually link a received email to a CRM client record. Use this when automatic matching failed or matched the wrong client.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `emailId` | string | The received email's unique ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `clientId` | string | Yes | The client ID to link this email to (e.g. `cli_002`) |

**Example:** `POST /api/emails/inbox/recv_005/link?clientId=cli_002`

**Response (200):**

```json
{
  "success": true,
  "emailId": "recv_005",
  "previousClientId": null,
  "linkedClientId": "cli_002",
  "linkedClientName": "James O'Brien",
  "message": "Email linked to client James O'Brien"
}
```

**Errors:**

| Status | Code | Description |
|--------|------|-------------|
| 404 | `EMAIL_NOT_FOUND` | No email with that ID |
| 404 | `CLIENT_NOT_FOUND` | Client ID does not exist |

---

### DELETE `/api/emails/inbox/{emailId}`

Permanently delete a received email from the CRM inbox. Only `admin` users can delete emails.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `emailId` | string | The received email's unique ID |

**Response (200):**

```json
{
  "success": true,
  "message": "Email recv_003 has been permanently deleted."
}
```

**Errors:**

| Status | Code | Description |
|--------|------|-------------|
| 404 | `EMAIL_NOT_FOUND` | No email with that ID |
| 403 | `INSUFFICIENT_PERMISSIONS` | Only admin can delete emails |
