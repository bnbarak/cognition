# Doc-Update Agent — MVP

An automated system that keeps API documentation in sync with code changes. When engineers modify endpoints, the agent detects the changes, updates annotations and docs, regenerates OpenAPI specs, and creates a PR — so docs never fall behind.

Built for internal teams tired of outdated API docs.

---

## Repo Structure

```
cognition/
├── javascript/              # TypeScript / Express API (mock insurance CRM)
│   └── src/routes/          # Auth, Clients, COI, Claims controllers
├── java/                    # Java / Spring Boot email service (mock)
│   └── src/.../controller/  # Send Email, Receive Email controllers
├── docs/                    # MkDocs documentation site
│   ├── docs/                # Markdown pages (auto-rendered API refs + narrative)
│   ├── docs/specs/          # Generated OpenAPI JSON specs
│   ├── mkdocs.yml           # MkDocs config (shadcn theme + OAD plugin)
│   └── domain-map.yaml      # Maps source files → doc concerns
├── tools/
│   └── diff-analyzer/       # CLI that parses PR diffs into structured JSON
├── scripts/
│   └── generate-openapi-specs.sh  # Starts servers, fetches specs, shuts down
├── .agents/
│   ├── playbooks/
│   │   └── doc-update.md    # Main agent orchestration prompt
│   └── skills/
│       ├── annotation-language/   # Writing quality standards (BAD/GOOD examples)
│       ├── express-openapi/       # JSDoc @openapi patterns for Express
│       ├── java-openapi/          # @Operation/@Schema patterns for Spring Boot
│       ├── diff-analyzer/         # CLI usage and output shape
│       └── update-domain-mapping/ # How to maintain domain-map.yaml
└── AGENTS.md                # Project conventions for AI agents
```

**Mock codebase:** The `javascript/` and `java/` directories contain a realistic insurance CRM API with 6 controllers and 20+ endpoints. This is the example codebase the agent operates on.

**Agent configuration:** Everything under `.agents/` defines how the doc-update agent behaves — what to read, how to write, and what quality bar to hit.

---

## How the Agent Works

```
  PR merged / code changed
           │
           ▼
  ┌─────────────────────┐
  │  1. Run diff-analyzer│  Parse the PR diff into structured JSON
  │     CLI (--pr N)     │  (files changed, hunks, additions/deletions)
  └──────────┬──────────┘
             │
             ▼
  ┌─────────────────────┐
  │  2. Read domain map  │  Match changed files to doc concerns
  │     (domain-map.yaml)│  (auth, clients, claims, COI, email...)
  └──────────┬──────────┘
             │
             ▼
  ┌─────────────────────┐
  │  3. Filter noise     │  Skip tests, configs, utils — only
  │                      │  process files that affect docs
  └──────────┬──────────┘
             │
             ▼
  ┌─────────────────────┐
  │  4. Group by concern │  Cluster related changes together
  │                      │  (e.g. "claims" = routes + types + model)
  └──────────┬──────────┘
             │
             ▼
  ┌─────────────────────┐
  │  5. For each concern │
  │     group, choose:   │
  │                      │
  │  Path A: API changes │──► Update @openapi annotations in source
  │  (annotations/specs) │    → Regenerate OpenAPI specs
  │                      │    → OAD plugin auto-renders API pages
  │                      │
  │  Path B: Narrative   │──► Edit markdown docs directly
  │  (product, auth,     │    (index.md, product.md, etc.)
  │   business context)  │
  └──────────┬──────────┘
             │
             ▼
  ┌─────────────────────┐
  │  6. Assess confidence│  HIGH → auto-submit
  │     per concern      │  MEDIUM → flag for review
  │                      │  LOW → draft PR, human review required
  └──────────┬──────────┘
             │
             ▼
  ┌─────────────────────┐
  │  7. Create docs PR   │  Annotations + specs + doc pages
  │     with freshness   │  stamped with commit, date, author
  │     stamps           │
  └─────────────────────┘
```

---

## Running the Agent

Start a Devin session and type:

```
!doc-update PR#<number>
```

The agent handles everything from there — analyzes the diff, updates docs, regenerates specs, and creates a PR.

---

## Running Locally

### Express API (TypeScript)

```bash
cd javascript && npm install && npm run dev
# API:        http://localhost:3000
# Swagger UI: http://localhost:3000/api-docs
```

### Email Service (Java / Spring Boot)

```bash
cd java && mvn spring-boot:run
# API:        http://localhost:8080
# Swagger UI: http://localhost:8080/swagger-ui/index.html
```

### Documentation Site (MkDocs)

```bash
cd docs
pip install mkdocs mkdocs-shadcn neoteroi-mkdocs pymdown-extensions
mkdocs serve
# Docs: http://localhost:8000
```

### Generate OpenAPI Specs

```bash
./scripts/generate-openapi-specs.sh
# Output: docs/docs/specs/express-openapi.json
#         docs/docs/specs/springboot-openapi.json
```

---

## Key Design Decisions

- **Annotations live with code.** OpenAPI docs are embedded as JSDoc / `@Operation` comments in the source files, not maintained separately. Any agent that reads the code can keep docs in sync.
- **Specs are generated, not hand-written.** The `generate-openapi-specs.sh` script starts the servers, fetches live OpenAPI JSON, and commits it. The MkDocs OAD plugin renders specs into API reference pages automatically.
- **Skills ground the agent.** Skill files provide concrete BAD/GOOD examples so the agent writes consistent, high-quality annotations instead of generic LLM filler.
- **Freshness stamps track drift.** Every doc page carries a machine-readable timestamp showing when it was last updated, by whom, and from which PR.
- **Stateless by design.** Each agent run is a fresh session. All persistent context comes from files in the repo (`domain-map.yaml`, skills, specs) and Devin Knowledge Notes.
