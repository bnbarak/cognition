# Core API (TypeScript / Express)

<!-- doc-freshness: { "commit": "be06edb", "date": "2026-04-03", "updatedBy": "devin-ai-integration[bot]", "pr": 30 } -->

!!! info "Last updated: 2026-04-03 | commit `be06edb` | by devin-ai-integration[bot] | PR #30"

**Base URL:** `http://localhost:3000`
**Source:** `javascript/src/routes/`

The Core API handles authentication, client management, policy tracking, certificate of insurance generation, and client notifications for InsureCRM.

## Controllers

| Controller | Base Path | Concern |
|-----------|-----------|---------|
| Auth | `/api/auth` | Login, register, token refresh, password reset |
| Clients | `/api/clients` | Client management, policy attachment, tag management, search/filter |
| COI | `/api/coi` | Certificate of Insurance generation from policy data |
| Notifications | `/api/notifications` | Client notification management, read tracking, bulk read-all |

**Auth required:** No (login, forgot-password) | Yes (all other endpoints)
**Roles:** Admin (full access), Agent (assigned clients only), Viewer (read-only)

See the [Authentication Guide](../authentication.md) for JWT details, roles, and test credentials.

---

## API Reference

::OAD(../specs/express-openapi.json)
