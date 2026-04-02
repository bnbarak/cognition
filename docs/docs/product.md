# InsureCRM — Product Overview

## What is InsureCRM?

InsureCRM is a **Customer Relationship Management** platform built specifically for **insurance agencies**. It combines client management, policy tracking, and tracked communications into a single system so agents can manage their entire book of business without switching tools.

---

## Key Features

### Client Management

Maintain a centralized database of all clients and prospects. Each client record includes contact details, assigned agent, policy history, and tags for segmentation.

- **Client profiles** — name, email, phone, address, date of birth
- **Agent assignment** — every client is assigned to one agent; agents only see their own clients
- **Tagging** — arbitrary tags for segmentation (e.g. `high-value`, `renewal-q4`, `commercial`)
- **Search & filtering** — search by name, email, or phone; filter by agent or tag
- **Pagination & sorting** — configurable page size, sort by name or date

### Policy Tracking

Link multiple insurance policies to each client. Track premiums, renewal dates, and status across all policy types.

| Policy Type | Example Use Case |
|------------|-----------------|
| **Auto** | Vehicle liability, collision, comprehensive |
| **Home** | Homeowner's, renter's, flood |
| **Life** | Term life, whole life, universal |
| **Health** | Individual, family, supplemental |
| **Commercial** | General liability, professional liability, workers' comp |

Each policy record stores: provider name, policy number, premium amount, start/end dates, and status (active, expired, cancelled, pending).

### Email Communication

Two-way email built into the CRM — send tracked outbound emails and receive inbound emails matched to client records.

**Outbound (Send Email Service):**

- Single email with optional CRM record linking
- Bulk send for campaigns and renewal reminders
- Template engine with variable resolution (`{{client.firstName}}`, `{{policy.renewalDate}}`, etc.)
- Delivery tracking: queued → sent → delivered → opened → clicked
- Full sent history with date-range and client filtering

**Inbound (Receive Email Service):**

- Automatic client matching by sender email address
- Manual client linking for unmatched emails
- Read/unread status tracking
- Tag-based triage (e.g. `claim`, `inquiry`, `renewal`, `urgent`)
- Paginated inbox with unread count

### Authentication & Access Control

Secure, role-based access using JWT tokens. Three roles with distinct permission sets.

| Role | Description |
|------|-------------|
| **Admin** | Full agency access — manage users, clients, policies, and settings |
| **Agent** | Manages assigned clients and their policies; can send emails |
| **Viewer** | Read-only access for auditing and reporting |

See the [Authentication Guide](authentication.md) for full details on JWT tokens, permissions, and test credentials.

---

## Architecture

InsureCRM follows a two-service architecture:

### Core API (TypeScript / Express — port 3000)

Handles identity, client data, and policy management.

| Controller | Endpoints | Concern |
|-----------|-----------|---------|
| [Auth Controller](api/auth-controller.md) | 5 | Login, register, token refresh, password reset |
| [Clients Controller](api/clients-controller.md) | 6 | Client management, policy attachment, tag management, search/filter |

### Email Service (Java / Spring Boot — port 8080)

Handles all email operations — both outbound and inbound.

| Controller | Endpoints | Concern |
|-----------|-----------|---------|
| [Send Email Controller](api/send-email-controller.md) | 5 | Send, bulk send, templates, delivery status, history |
| [Receive Email Controller](api/receive-email-controller.md) | 5 | Inbox listing, read status, client linking, deletion |

Both services expose **OpenAPI/Swagger** specs for integration and client generation.

---

## Data Model

```
Agency
 └── User (admin | agent | viewer)
 └── Client
      ├── Contact Info (email, phone, address)
      ├── Policy[] (auto, home, life, health, commercial)
      ├── Sent Emails[]
      └── Received Emails[]
```

---

## Target Users

| Persona | Role | Uses InsureCRM For |
|---------|------|--------------------|
| **Insurance Agent** | agent | Managing clients, tracking policies, sending renewal reminders |
| **Office Manager** | admin | Overseeing agents, bulk email campaigns, reporting |
| **Agency Administrator** | admin | User management, agency settings, compliance |
| **Compliance Viewer** | viewer | Auditing client records, reviewing email history |
