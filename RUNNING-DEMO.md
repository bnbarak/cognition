# Running the Demo Environment Locally

This guide covers how to run the mock InsureCRM services that the doc-update agent operates on.

---

## Express API (TypeScript)

```bash
cd javascript && npm install && npm run dev
# API:        http://localhost:3000
# Swagger UI: http://localhost:3000/api-docs
```

## Email Service (Java / Spring Boot)

```bash
cd java && mvn spring-boot:run
# API:        http://localhost:8080
# Swagger UI: http://localhost:8080/swagger-ui/index.html
```

## Documentation Site (MkDocs)

```bash
cd docs
pip install mkdocs mkdocs-shadcn neoteroi-mkdocs pymdown-extensions
mkdocs serve
# Docs: http://localhost:8000
```

**Public deployment:** [https://crm-api-generator-iymkmkjb.devinapps.com](https://crm-api-generator-iymkmkjb.devinapps.com)

## Generate OpenAPI Specs

```bash
./scripts/generate-openapi-specs.sh
# Output: docs/docs/specs/express-openapi.json
#         docs/docs/specs/springboot-openapi.json
```
