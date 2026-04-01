# Send Email Controller

**Service:** Email Service (Java / Spring Boot)
**Base path:** `/api/emails/send`
**Source:** `java/src/main/java/com/insurecrm/email/controller/SendEmailController.java`

Handles all outbound email operations — sending individual emails, bulk emails, template-based emails, and checking delivery status.

---

## Endpoints

### POST `/api/emails/send`

Send a single email to one or more recipients. Optionally link the email to a client or policy record for tracking.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string[] (email) | Yes | Recipient email addresses |
| `cc` | string[] (email) | No | CC recipients |
| `bcc` | string[] (email) | No | BCC recipients |
| `subject` | string | Yes | Email subject line |
| `body` | string | Yes | Email body content |
| `contentType` | string | No | `text/plain` (default) or `text/html` |
| `templateId` | string | No | Template to use (overrides body) |
| `clientId` | string | No | Associated CRM client ID |
| `policyId` | string | No | Associated policy ID |

**Response (202):**

```json
{
  "success": true,
  "message": "Email queued for delivery",
  "messageId": "msg_abc123",
  "timestamp": "2024-06-15T14:30:00Z"
}
```

---

### POST `/api/emails/send/bulk`

Send the same email template to multiple recipients. Useful for renewal reminders, agency announcements, or marketing campaigns.

**Request Body:** Array of `EmailRequest` objects (same schema as single send).

**Response (202):** Returns a batch ID and count of queued emails.

---

### POST `/api/emails/send/template/{templateId}`

Send an email using a pre-defined CRM template. Template variables are auto-resolved from the linked client and policy records.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `templateId` | string | ID of the email template |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `clientId` | string | Yes | Client whose data populates the template |
| `policyId` | string | No | Policy for policy-specific templates |

**Response (202):** Confirmation with message ID.

---

### GET `/api/emails/send/status/{messageId}`

Check the delivery status of a previously sent email.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `messageId` | string | The message ID returned when the email was sent |

**Response (200):**

```json
{
  "messageId": "msg_abc123",
  "status": "delivered",
  "deliveredAt": "2024-06-15T14:35:00Z",
  "opens": 2,
  "clicks": 1
}
```

---

### GET `/api/emails/send/history`

Retrieve a paginated list of previously sent emails, with optional filtering.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page |
| `clientId` | string | — | Filter by client |
| `from` | string (date) | — | Start of date range |
| `to` | string (date) | — | End of date range |

**Response (200):** Paginated list of sent email summaries.
