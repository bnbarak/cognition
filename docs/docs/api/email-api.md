# Email API (Java / Spring Boot)

**Base URL:** `http://localhost:8080`
**Source:** `java/src/main/java/com/insurecrm/api/controller/`

The Email API handles sending and receiving emails for InsureCRM, providing outbound email delivery and inbound email processing for the insurance agency workflow.

## Controllers

| Controller | Base Path | Concern |
|-----------|-----------|---------|
| Send Email | `/api/email/send` | Outbound email delivery with template support |
| Receive Email | `/api/email/receive` | Inbound email processing and webhook handling |

---

## API Reference

::OAD(./specs/springboot-openapi.json)
