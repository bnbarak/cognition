# InsureCRM Documentation

<!-- doc-freshness: { "commit": "dc34067", "date": "2026-04-02", "updatedBy": "devin-ai-integration[bot]", "pr": 19 } -->

!!! info "Last updated: 2026-04-02 | commit `dc34067` | by devin-ai-integration[bot] | PR #19"

Welcome to the **InsureCRM** developer documentation. InsureCRM is a CRM platform purpose-built for insurance agencies — managing clients, policies, and agent communications in one system.

---

## System at a Glance

InsureCRM is composed of **two backend services** and **six controllers**, each handling a distinct concern:

| Service | Controller | Concern | Base Path | Port |
|---------|-----------|---------|-----------|------|
| **Core API** (TypeScript / Express) | [Auth, Clients, COI, Notifications](api/core-api.md) | Identity, login, tokens, client CRUD, policy management, COI generation, notifications | `/api/auth`, `/api/clients`, `/api/coi`, `/api/notifications` | 3000 |
| **Email Service** (Java / Spring Boot) | [Send Email, Receive Email](api/email-api.md) | Outbound email dispatch, inbound email processing | `/api/emails/send`, `/api/emails/inbox` | 8080 |

---

## Concerns Breakdown

### 1. Authentication & Identity (`/api/auth`)

Handles all user-facing identity operations. Uses **JWT** with short-lived access tokens (1 hour) and long-lived refresh tokens (30 days). Supports three roles: **Admin**, **Agent**, and **Viewer**.

- Login with email/password → receive JWT token pair
- Register new agency users with role assignment
- Token refresh for seamless sessions
- Password reset via email (forgot → reset flow)

See: [Authentication Guide](authentication.md) | [Core API Reference](api/core-api.md)

### 2. Client & Policy Management (`/api/clients`)

The core data layer — managing insurance clients and their policies. Every client belongs to an agency and is assigned to a specific agent.

- List, search, and filter clients (by agent, tags, name)
- Create and update client profiles with contact info and addresses
- Attach insurance policies (auto, home, life, health, commercial) to clients
- Track premium amounts, renewal dates, and policy status

See: [Core API Reference](api/core-api.md)

### 4. Outbound Email (`/api/emails/send`)

Send tracked emails from within the CRM. Supports individual sends, bulk campaigns, and template-based emails that auto-populate with client/policy data.

- Send single emails with CRM record linking
- Bulk send for renewals, announcements, and campaigns
- Template engine resolves client/policy variables automatically
- Delivery tracking: status, opens, clicks
- Full sent history with date and client filtering

See: [Email API Reference](api/email-api.md)

### 5. Certificate of Insurance (`/api/coi`)

Generates Certificates of Insurance (COI) from policy data. Agents can create, list, verify, and revoke certificates for clients.

- Generate a COI from an existing policy
- List all certificates with filtering by client or status
- Look up a certificate by certificate number
- Verify certificate authenticity
- Revoke a certificate when a policy is cancelled

See: [Core API Reference](api/core-api.md)

### 6. Notifications (`/api/notifications`)

Manages client-facing notifications for events like claim updates, policy renewals, payment reminders, and document requests. Notifications are prioritized and support read/unread tracking.

- Create notifications linked to a client
- List notifications with filtering by client, type, priority, and read status
- Mark individual or all client notifications as read
- Delete notifications

See: [Core API Reference](api/core-api.md)

### 7. Inbound Email (`/api/emails/inbox`)

Receives and manages incoming emails. Automatically matches emails to CRM client records based on sender address. Supports tagging for triage.

- Paginated inbox with unread filtering
- Automatic client matching by sender email
- Manual client linking for unmatched emails
- Read/unread status management
- Tag-based classification for agent triage

See: [Email API Reference](api/email-api.md)

---

## Authentication Overview

All API endpoints (except login, forgot-password, and reset-password) require a valid JWT in the `Authorization` header. Note that register requires admin-level authentication.

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

| Detail | Value |
|--------|-------|
| **Scheme** | Bearer JWT |
| **Access token lifetime** | 1 hour |
| **Refresh token lifetime** | 30 days |
| **Issuer** | `insurecrm-core-api` |
| **Algorithm** | HS256 |
| **Roles** | `admin`, `agent`, `viewer` |

For full details, see the [Authentication Guide](authentication.md).

---

## Getting Started

### Core API (TypeScript)

```bash
cd javascript
npm install
npm run dev
# API:        http://localhost:3000
# Swagger UI: http://localhost:3000/api-docs
# OpenAPI:    http://localhost:3000/openapi.json
```

### Email Service (Java)

```bash
cd java
mvn spring-boot:run
# API:        http://localhost:8080
# Swagger UI: http://localhost:8080/swagger-ui/index.html
# OpenAPI:    http://localhost:8080/api-docs
```

### Documentation

```bash
cd docs
pip install mkdocs mkdocs-shadcn neoteroi-mkdocs pymdown-extensions
mkdocs serve
# Docs: http://localhost:8000
```

### Generate OpenAPI Specs

```bash
./scripts/generate-openapi-specs.sh
# Output: docs/docs/specs/express-openapi.json, docs/docs/specs/springboot-openapi.json
```
