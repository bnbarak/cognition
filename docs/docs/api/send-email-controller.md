# Send Email Controller

**Service:** Email Service (Java / Spring Boot)
**Base path:** `/api/emails/send`
**Source:** `java/src/main/java/com/insurecrm/email/controller/SendEmailController.java`
**Auth required:** Yes (all endpoints)
**Roles:** Admin (all operations), Agent (own clients only), Viewer (no access)

Handles all outbound email operations — sending individual emails, bulk campaigns, template-based emails, and delivery tracking.

---

## Endpoints

### POST `/api/emails/send`

Send a single email to one or more recipients. Optionally link the email to a CRM client or policy record for tracking.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string[] (email) | Yes | Recipient email addresses (max 50) |
| `cc` | string[] (email) | No | CC recipients |
| `bcc` | string[] (email) | No | BCC recipients |
| `subject` | string | Yes | Email subject line (max 200 chars) |
| `body` | string | Yes | Email body content |
| `contentType` | string | No | `text/plain` (default) or `text/html` |
| `templateId` | string | No | Template to use (overrides body) |
| `clientId` | string | No | Associated CRM client ID for tracking |
| `policyId` | string | No | Associated policy ID for tracking |

**Example request:**

```json
{
  "to": ["maria.martinez@gmail.com"],
  "subject": "Your Auto Policy Renewal - Action Required",
  "body": "Hi Maria,\n\nYour State Farm auto policy (SF-2024-78901) is coming up for renewal on January 1, 2025.\n\nYour current annual premium is $1,850.00. I've reviewed your coverage and found a few options that could save you up to 15%.\n\nWould you like to schedule a call this week to discuss?\n\nBest regards,\nSarah Thompson\nBrightway Insurance Partners",
  "contentType": "text/plain",
  "clientId": "cli_001",
  "policyId": "pol_101"
}
```

**Response (202):**

```json
{
  "success": true,
  "message": "Email queued for delivery",
  "messageId": "msg_7k2m9p4x",
  "timestamp": "2024-06-15T14:30:00Z"
}
```

**Errors:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | `VALIDATION_ERROR` | Missing required fields or invalid email format |
| 403 | `INSUFFICIENT_PERMISSIONS` | Viewer cannot send emails; Agent can only email assigned clients |

---

### POST `/api/emails/send/bulk`

Send emails to multiple recipients. Each item in the array is a separate email with its own subject, body, and recipient list. Useful for renewal reminders, announcements, or marketing campaigns.

**Request Body:** Array of `EmailRequest` objects (same schema as single send).

**Example request:**

```json
[
  {
    "to": ["maria.martinez@gmail.com"],
    "subject": "Renewal Reminder: Auto Policy SF-2024-78901",
    "body": "Hi Maria, your auto policy renews on Jan 1, 2025...",
    "clientId": "cli_001"
  },
  {
    "to": ["james.obrien@outlook.com"],
    "subject": "Renewal Reminder: Commercial Policy HF-2024-COM-33219",
    "body": "Hi James, your commercial liability policy renews on Jul 1, 2025...",
    "clientId": "cli_002"
  }
]
```

**Response (202):**

```json
{
  "success": true,
  "message": "Bulk email batch queued",
  "batchId": "batch_r3t5y7u9",
  "queued": 2,
  "timestamp": "2024-06-15T14:35:00Z"
}
```

---

### POST `/api/emails/send/template/{templateId}`

Send an email using a pre-defined CRM template. Template variables (e.g. `{{client.firstName}}`, `{{policy.renewalDate}}`) are auto-resolved from the linked client and policy records.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `templateId` | string | ID of the email template (e.g. `tpl_renewal_reminder`) |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `clientId` | string | Yes | Client whose data populates the template |
| `policyId` | string | No | Policy for policy-specific variables |

**Available templates:**

| Template ID | Purpose |
|------------|---------|
| `tpl_welcome` | New client welcome email |
| `tpl_renewal_reminder` | Policy renewal reminder (30 days before expiry) |
| `tpl_claim_update` | Claim status update notification |
| `tpl_payment_receipt` | Premium payment confirmation |
| `tpl_birthday` | Client birthday greeting |

**Example:** `POST /api/emails/send/template/tpl_renewal_reminder?clientId=cli_001&policyId=pol_101`

**Response (202):**

```json
{
  "success": true,
  "message": "Template email queued for delivery",
  "messageId": "msg_8n3p5r7t",
  "templateId": "tpl_renewal_reminder",
  "resolvedSubject": "Renewal Reminder: Your Auto Policy Renews on Jan 1, 2025",
  "timestamp": "2024-06-15T14:40:00Z"
}
```

---

### GET `/api/emails/send/status/{messageId}`

Check the delivery status of a previously sent email. Includes engagement tracking (opens, clicks).

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `messageId` | string | The message ID returned when the email was sent (e.g. `msg_7k2m9p4x`) |

**Response (200):**

```json
{
  "messageId": "msg_7k2m9p4x",
  "status": "delivered",
  "statusHistory": [
    { "status": "queued", "at": "2024-06-15T14:30:00Z" },
    { "status": "sent", "at": "2024-06-15T14:30:02Z" },
    { "status": "delivered", "at": "2024-06-15T14:30:05Z" }
  ],
  "deliveredAt": "2024-06-15T14:30:05Z",
  "opens": 2,
  "firstOpenedAt": "2024-06-15T15:12:00Z",
  "clicks": 1,
  "firstClickedAt": "2024-06-15T15:13:30Z"
}
```

**Status values:** `queued` → `sent` → `delivered` | `bounced` | `failed`

**Errors:**

| Status | Code | Description |
|--------|------|-------------|
| 404 | `MESSAGE_NOT_FOUND` | No email with that message ID |

---

### GET `/api/emails/send/history`

Retrieve a paginated list of previously sent emails, with optional filtering by client and date range.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page (max 100) |
| `clientId` | string | — | Filter by linked client |
| `from` | string (date) | — | Start of date range (`YYYY-MM-DD`) |
| `to` | string (date) | — | End of date range (`YYYY-MM-DD`) |

**Example:** `GET /api/emails/send/history?clientId=cli_001&from=2024-06-01&to=2024-06-30`

**Response (200):**

```json
{
  "emails": [
    {
      "messageId": "msg_7k2m9p4x",
      "to": ["maria.martinez@gmail.com"],
      "subject": "Your Auto Policy Renewal - Action Required",
      "status": "delivered",
      "sentAt": "2024-06-15T14:30:00Z",
      "clientId": "cli_001",
      "opens": 2,
      "clicks": 1
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
