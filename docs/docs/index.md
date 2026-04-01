# InsureCRM Documentation

Welcome to the **InsureCRM** developer documentation. InsureCRM is a modern CRM platform purpose-built for insurance agencies.

## Services

InsureCRM is composed of two backend services:

| Service | Stack | Port | Description |
|---------|-------|------|-------------|
| **Core API** | TypeScript / Express | 3000 | Authentication, client management, and policy tracking |
| **Email Service** | Java / Spring Boot | 8080 | Outbound and inbound email management |

## Quick Links

- [Product Overview](product.md) — Learn what InsureCRM does
- [Auth Controller](api/auth-controller.md) — User authentication endpoints
- [Clients Controller](api/clients-controller.md) — Client & policy CRUD
- [Send Email Controller](api/send-email-controller.md) — Outbound email operations
- [Receive Email Controller](api/receive-email-controller.md) — Inbound email management

## Getting Started

### Core API (TypeScript)

```bash
cd javascript
npm install
npm run dev
# Swagger UI: http://localhost:3000/api-docs
```

### Email Service (Java)

```bash
cd java
mvn spring-boot:run
# Swagger UI: http://localhost:8080/swagger-ui.html
```

### Documentation

```bash
cd docs
pip install mkdocs mkdocs-material
mkdocs serve
# Docs: http://localhost:8000
```
