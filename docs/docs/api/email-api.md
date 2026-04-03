# Email API (Java / Spring Boot)

<!-- doc-freshness: { "commit": "dc34067", "date": "2026-04-02", "updatedBy": "devin-ai-integration[bot]", "pr": 19 } -->

!!! info "Last updated: 2026-04-02 | commit `dc34067` | by devin-ai-integration[bot] | PR #19"

**Base URL:** `http://localhost:8080`
**Source:** `java/src/main/java/com/insurecrm/email/controller/`

The Email API handles sending and receiving emails for InsureCRM, providing outbound email delivery and inbound email processing for the insurance agency workflow.

## Controllers

| Controller | Base Path | Concern |
|-----------|-----------|---------|
| Send Email | `/api/emails/send` | Outbound email delivery with template support |
| Receive Email | `/api/emails/inbox` | Inbound email processing and webhook handling |

---

## API Reference

::OAD(../specs/springboot-openapi.json)
