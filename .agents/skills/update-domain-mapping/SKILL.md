# SKILL: Update Domain Mapping

## Purpose

Maintain `docs/domain-map.yaml` — the single source of truth that maps **source code files** to **documentation pages** and **OpenAPI specs**. This file is consumed by the `!doc-update` agent to determine which docs need updating when code changes.

---

## Core Rules

### 1. Only map direct contributors

A "direct contributor" is a file whose changes **directly alter the public API surface or documented behavior**. This means:

- **Controllers / route handlers** → YES (they define endpoints)
- **Request/response types and DTOs** → YES (they define schemas)
- **Model classes** → YES (they define data shapes exposed in APIs)
- **Utility functions, helpers, middleware** → NO
- **Config files, test files, build scripts** → NO
- **Shared libraries, base classes, abstract interfaces** → NO

**Rule of thumb:** If a file change would NOT require updating any doc page or OpenAPI spec, it does NOT belong in the domain map.

### 2. Map at three levels of granularity

```yaml
# Level 1: Doc page → list of source files (whole file)
pages:
  - doc: docs/docs/api/auth-controller.md
    sources:
      - file: javascript/src/routes/auth.ts

# Level 2: Doc sub-section → specific source file
  - doc: docs/docs/api/auth-controller.md
    section: "POST /api/auth/login"
    sources:
      - file: javascript/src/routes/auth.ts

# Level 3: Large file → specific line range
  - doc: docs/docs/api/auth-controller.md
    section: "POST /api/auth/login"
    sources:
      - file: javascript/src/routes/auth.ts
        lines: [14, 50]
```

Use the **most specific level that makes sense**:

- Small files (<100 lines) → whole file reference (no `lines`)
- Medium files (100–300 lines) with clear endpoint blocks → line ranges per endpoint
- Large files (300+ lines) → line ranges are **mandatory**

### 3. Every entry must have exactly these fields

```yaml
pages:
  - doc: <relative path to the markdown doc page>
    section: <optional — heading or endpoint name within that page>
    sources:
      - file: <relative path to source file>
        lines: <optional — [start, end] inclusive line range>
        concern: <one-line description of what this file contributes>
```

- `doc` — path relative to repo root (e.g., `docs/docs/api/auth-controller.md`)
- `section` — matches a heading or endpoint in the doc. Omit for "whole page" mappings
- `sources` — list of 1+ source files. Each has:
  - `file` — path relative to repo root
  - `lines` — optional `[start, end]` inclusive. Only use when the file is large and only a specific block is relevant
  - `concern` — required. One sentence explaining what this source contributes to the doc

### 4. Also map OpenAPI specs

OpenAPI specs are generated artifacts, but we track which source files feed into them:

```yaml
specs:
  - spec: specs/express-openapi.json
    sources:
      - file: javascript/src/routes/auth.ts
        concern: "Auth endpoints and JSDoc OpenAPI annotations"
      - file: javascript/src/routes/clients.ts
        concern: "Client endpoints and JSDoc OpenAPI annotations"

  - spec: specs/springboot-openapi.json
    sources:
      - file: java/src/.../SendEmailController.java
        concern: "Send email endpoints and Swagger annotations"
```

### 5. Cross-reference pages

Some doc pages aggregate info from multiple controllers. The `index.md` (homepage) and `product.md` are cross-cutting. Map them separately:

```yaml
  - doc: docs/docs/index.md
    section: "System at a Glance"
    sources:
      - file: javascript/src/routes/auth.ts
        concern: "Auth controller exists and its base path"
      - file: javascript/src/routes/clients.ts
        concern: "Clients controller exists and its base path"
```

---

## How to Update the Domain Map

### When a PR adds a NEW controller/feature:

1. Add a new `pages` entry mapping the new doc page to the new source files
2. Add the new source files to the relevant `specs` entry
3. Add the new controller to cross-cutting pages (`index.md`, `product.md`) if it introduces a new concern
4. Set line ranges if the new file is >100 lines

### When a PR modifies an EXISTING endpoint:

1. Check if line ranges shifted — update `lines` values if so
2. Do NOT add new entries — the mapping already exists
3. If a new endpoint was added to an existing controller, add a new `section` entry with its line range

### When a PR removes an endpoint/controller:

1. Remove the corresponding `pages` entry
2. Remove from `specs.sources`
3. Remove from cross-cutting page mappings

### When types/DTOs change:

1. Types are mapped alongside their controller. If `types/auth.ts` changes, the mapping for `auth-controller.md` already covers it because `types/auth.ts` is listed as a source
2. Do NOT create separate doc pages for type files — they are supporting sources

---

## Validation Checklist

Before committing changes to `docs/domain-map.yaml`, verify:

- [ ] Every `doc` path actually exists in the repo (or will be created by the same PR)
- [ ] Every `file` path actually exists in the repo
- [ ] Every `lines` range is accurate for the CURRENT state of the file (not a stale range)
- [ ] No utility/helper files are mapped (only direct API contributors)
- [ ] Every source has a `concern` description
- [ ] Cross-cutting pages (`index.md`, `product.md`, `authentication.md`) include all controllers
- [ ] Spec entries include all controller/route files that contribute OpenAPI annotations
- [ ] No duplicate entries (same doc+section+file combination)

---

## Anti-Patterns (DO NOT DO)

1. **DO NOT** map middleware, auth guards, or validation utilities — these are shared infrastructure, not doc-relevant sources
2. **DO NOT** map test files — tests don't affect documentation
3. **DO NOT** use vague concerns like "related to auth" — be specific: "Login endpoint handler, lines 14-50"
4. **DO NOT** map the entire `types/` directory — only map specific type files that define request/response shapes for documented endpoints
5. **DO NOT** create line ranges for files under 100 lines — just reference the whole file
6. **DO NOT** map `app.ts`, `main.ts`, or application bootstrap files — these wire routes but don't define API behavior
7. **DO NOT** map `package.json`, `pom.xml`, or build configuration — these are infrastructure
