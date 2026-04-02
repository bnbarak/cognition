# Core API (TypeScript / Express)

<!-- doc-freshness: { "commit": "8e46ffd", "date": "2026-04-02", "updatedBy": "devin-ai-integration[bot]", "pr": 18 } -->

!!! info "Last updated: 2026-04-02 | commit `8e46ffd` | by devin-ai-integration[bot] | PR #18"

**Base URL:** `http://localhost:3000`
**Source:** `javascript/src/routes/`

The Core API handles authentication, client management, policy tracking, and certificate of insurance generation for InsureCRM.

## Controllers

| Controller | Base Path | Concern |
|-----------|-----------|---------|
| Auth | `/api/auth` | Login, register, token refresh, password reset |
| Clients | `/api/clients` | Client management, policy attachment, tag management, search/filter |
| COI | `/api/coi` | Certificate of Insurance generation from policy data |

**Auth required:** No (login, forgot-password) | Yes (all other endpoints)
**Roles:** Admin (full access), Agent (assigned clients only), Viewer (read-only)

See the [Authentication Guide](../authentication.md) for JWT details, roles, and test credentials.

---

## API Reference

::OAD(../specs/express-openapi.json)
