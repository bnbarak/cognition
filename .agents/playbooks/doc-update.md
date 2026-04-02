# !doc-update — Automated Documentation & Spec Updater

## Overview

You are a documentation agent. When a code PR is submitted, you analyze the changes, update source code annotations and/or narrative docs, regenerate OpenAPI specs, and create a PR. You process each concern independently, assess confidence, and decide whether to auto-submit or flag for human review.

**You are stateless.** Each run is a fresh session. All persistent context comes from `docs/domain-map.yaml` (in the repo) and Knowledge Notes (org-scoped).

**Two paths for doc updates:**
- **API-affecting changes** → update source code annotations (JSDoc / `@Operation`) → regenerate specs → OAD renders automatically
- **Narrative doc changes** → edit markdown directly (index, product, authentication, business context)

---

## What's Needed From User

- A PR number or branch name to analyze (e.g., `!doc-update PR#5` or `!doc-update devin/1775067018-core-logic-changes`)

---

## Procedure

### Step 1: Setup

1. Clone the repo `bnbarak/cognition` (if not already present)
2. Check out `main` and pull latest
3. Install the diff-analyzer CLI:
   ```bash
   cd tools/diff-analyzer && npm install
   ```
4. Install JavaScript dependencies:
   ```bash
   cd javascript && npm install
   ```

### Step 2: Generate the Diff

1. Identify the PR branch from the user's input
2. Fetch and check out the PR branch
3. Generate the unified diff:
   ```bash
   git diff main...<branch-name> > /tmp/pr-diff.txt
   ```

### Step 3: Run the Diff Analyzer CLI

```bash
cd tools/diff-analyzer
npx ts-node src/cli.ts /tmp/pr-diff.txt --pretty > /tmp/diff-analysis.json
```

This produces structured JSON with per-file classification, change metrics, and hunk ranges. See `.agents/skills/diff-analyzer/SKILL.md` for output shape.

### Step 4: Read Domain Map

Read `docs/domain-map.yaml` from the repo. This is the source of truth for code → docs → specs mapping.

### Step 5: Filter Noise

Remove files from the analysis that NEVER affect documentation:

- Test files: paths containing `__tests__/`, `test/`, `.test.ts`, `.spec.java`
- Lock files: `package-lock.json`, `*.lock`
- CI/CD files: `.github/`, `.gitlab-ci.yml`
- Build artifacts: `.gitignore`, editor configs, IDE files
- The diff-analyzer itself: `tools/diff-analyzer/**`

If zero meaningful files remain → **STOP**. Report "No documentation impact detected" and exit.

### Step 6: Group by Concern

For each remaining file, look it up in `docs/domain-map.yaml`:

1. Find all `pages[].sources[].file` and `specs[].sources[].file` entries that match the file path
2. Group files by the `doc` page they map to — files mapping to the same doc page belong to the same **concern-group**
3. If a file maps to multiple doc pages, it appears in EACH group
4. If a file is NOT in `docs/domain-map.yaml`:
   - If it's a NEW route/controller file → create a new group named after the file (this is a new feature)
   - If it's a type/model file → try to associate it with an existing group by directory proximity
   - Otherwise → place in an "unmapped" group
5. Also check `specs[].sources[]` — if a file maps to a spec, tag that spec on the concern-group

**Bail-out rule:** If you identify more than 7 concern-groups → **STOP**. Report:
> "This PR has [N] distinct documentation concerns. This is too complex for automated updates. Here's the breakdown: [list groups]. Please split the PR or review manually."

### Step 7: Update Docs for Each Concern-Group

Process each concern-group sequentially. For each group, determine which path to follow:

#### Path A: API-Affecting Changes (annotations → specs → OAD)

If the concern-group involves route handlers, controllers, request/response types, or endpoint behavior:

1. **Read the changed source files** from the PR branch
2. **Update source code annotations** to reflect the changes:
   - **Express (TypeScript):** Update JSDoc `@openapi` comment blocks above route handlers.
     See `.agents/skills/express-openapi/SKILL.md` for patterns.
     ```
     /**
      * @openapi
      * /api/auth/login:
      *   post:
      *     summary: Authenticate user
      *     tags: [Auth]
      *     requestBody: ...
      *     responses: ...
      */
     ```
   - **Spring Boot (Java):** Update `@Operation`, `@ApiResponse`, `@Schema`, `@Parameter` annotations.
     See `.agents/skills/java-openapi/SKILL.md` for patterns.
     ```java
     @Operation(summary = "Send email", description = "...")
     @ApiResponse(responseCode = "200", description = "...")
     ```
   - If an endpoint was **added** → add full annotation block
   - If an endpoint was **removed** → remove its annotation block
   - If request/response shapes changed → update the annotation schemas
   - If behavior changed → update summary/description text in annotations
3. **Regenerate OpenAPI specs** after updating annotations:
   ```bash
   ./scripts/generate-openapi-specs.sh
   ```
   This starts Express (port 3000) and Spring Boot (port 8080), fetches the live OpenAPI specs, saves them to `docs/docs/specs/`, and shuts down the servers.
4. The MkDocs OAD plugin will automatically render the updated specs on the API reference pages — **no manual editing of API doc pages needed**.

#### Path B: Narrative Doc Changes (edit markdown directly)

If the concern-group involves business logic descriptions, product context, authentication flows, or general documentation:

1. **Read the current doc page(s)** — understand what's already documented
2. **Update the markdown docs to reflect the code changes:**
   - `docs/docs/index.md` — system table, endpoint counts, concerns breakdown
   - `docs/docs/product.md` — architecture table, feature descriptions
   - `docs/docs/authentication.md` — if auth behavior changed
   - Other narrative pages as needed
3. If a new controller was added → create a new API page with OAD directive (see existing `api/core-api.md` as template), update `docs/mkdocs.yml` nav, update `docs/domain-map.yaml`

#### Both Paths

After processing each group, record:
- `concern`: name (e.g., "auth", "clients", "send-email")
- `path`: which path was used (A, B, or both)
- `confidence`: your assessment (see below)
- `affectedDocs`: list of doc pages updated
- `annotationsUpdated`: list of source files where annotations were modified (Path A only)
- `summary`: one-line description of what changed

**Confidence assessment per group:**
- **HIGH**: The change is mechanical and the update is straightforward (e.g., updating an annotation with clear field changes, removing a deleted endpoint, renaming)
- **MEDIUM**: New doc pages were needed, or cross-cutting pages were affected, or the change required some interpretation
- **LOW**: You're unsure whether a change is user-visible, or the code behavior is ambiguous, or you had to make judgment calls about what to document

### Step 8: Commit and Create PR

1. Create a new branch from the PR's branch:
   ```bash
   git checkout <pr-branch>
   git checkout -b docs/<pr-branch>
   ```
2. Stage all changes — annotations, regenerated specs, doc pages, and domain map:
   ```bash
   git add docs/ javascript/ java/ docs/domain-map.yaml
   ```
3. Commit with a descriptive message:
   ```bash
   git commit -m "docs: update documentation for PR#<number>
   
   Concern-groups processed:
   - <concern>: <confidence> [Path <A|B>] — <summary>
   - <concern>: <confidence> [Path <A|B>] — <summary>
   ..."
   ```
4. Push and create a PR targeting the original PR's branch (or main, depending on workflow):
   ```bash
   git push origin docs/<pr-branch>
   ```
5. Create the PR using the git_create_pr tool

### Step 9: Assess Confidence and Decide

Calculate overall confidence = **lowest confidence across all groups**.

| Overall Confidence | Action |
|-------------------|--------|
| **HIGH** | Auto-submit the PR. Add label `auto-docs`. Comment on the original PR: "Docs updated automatically. See PR#X." |
| **MEDIUM** | Submit the PR but flag for review. Add label `docs-review-requested`. Comment: "Docs updated with medium confidence. Please review PR#X, particularly: [list MEDIUM groups]." |
| **LOW** | Submit the PR as draft. Add label `docs-needs-review`. Comment: "Docs update drafted with low confidence. Human review required for PR#X. Uncertain areas: [list LOW groups with reasons]." |

### Step 10: Report

Send a summary message to the user with:
- PR link
- Table of concern-groups with confidence levels, paths used, and summaries
- What was updated (annotations, specs, doc pages, domain map)
- Whether OpenAPI specs were regenerated (and if they differed from committed versions)
- Any concerns or uncertainties

---

## Specifications

### Postconditions — what should be true when you're done:

1. Every doc concern affected by the code PR has been addressed — either via annotation updates (Path A) or markdown edits (Path B)
2. Source code annotations are accurate and complete for all API endpoints touched by the PR
3. OpenAPI specs have been regenerated from the updated annotations and committed to `docs/docs/specs/`
4. `docs/domain-map.yaml` has been updated if new controllers/endpoints were added or removed
5. A PR exists with all changes (annotations + specs + docs), properly labeled by confidence
6. A comment exists on the original PR linking to the doc-update PR
7. Narrative pages (index.md, product.md, authentication.md) are consistent with API changes

### API page format (OAD-based):

API reference pages use the neoteroi OAD plugin to auto-render from OpenAPI specs. A typical API page looks like:

```markdown
# Controller Name

**Base URL:** `http://localhost:PORT`
**Source:** `path/to/source/`

Brief description of the controller's purpose.

## Controllers

| Controller | Base Path | Concern |
|-----------|-----------|---------|
| Name | `/api/path` | Description |

---

## API Reference

::OAD(./specs/<spec-file>.json)
```

**Do NOT hand-write endpoint tables, request/response examples, or schema details.** The OAD plugin generates all of this from the spec. Your job is to keep the annotations accurate so the generated spec is correct.

---

## Skills Reference

The following skill files define the annotation patterns you must follow:

- **Express (TypeScript):** `.agents/skills/express-openapi/SKILL.md` — JSDoc `@openapi` comment blocks with swagger syntax
- **Spring Boot (Java):** `.agents/skills/java-openapi/SKILL.md` — `@Operation`, `@ApiResponse`, `@Schema`, `@Parameter` annotations

Read the relevant skill file before updating any annotations.

---

## Advice

- **Annotations live with the code.** This is a design principle. Docs are not separate from code — they're embedded in it as annotations. Any agent that touches the code can keep docs in sync.
- **Read existing annotations first.** Before modifying, read existing annotation blocks in the same file to understand the style and level of detail.
- **Don't invent behavior.** Only document what the code actually does. If you're unsure about a behavior, set confidence to LOW and note the uncertainty.
- **docs/domain-map.yaml is your compass.** If you can't find a file in the domain map, it might genuinely have no doc impact. Don't force a connection.
- **Cross-cutting pages are tricky.** Changes to `index.md`, `product.md`, and `authentication.md` affect multiple concerns. Double-check consistency.
- **The regenerated spec is the truth.** If the spec and the code annotations disagree, trust the spec — it was generated from the live running server on the PR branch.
- **When in doubt, set confidence LOW.** It's better to flag for human review than to auto-submit wrong docs.
- **Don't over-classify.** You don't need to label every change with a category. Just read the code, read the annotations, and update what's out of date.

---

## Forbidden Actions

1. **DO NOT** modify source code logic (route handlers, business logic, type definitions, controllers, tests). You may ONLY edit annotation/comment blocks (`@openapi` JSDoc, `@Operation`/`@Schema`/`@ApiResponse` annotations).
2. **DO NOT** auto-submit with HIGH confidence if any concern-group has LOW confidence.
3. **DO NOT** create doc pages for utility files, middleware, or internal helpers.
4. **DO NOT** delete information from docs unless the corresponding code was deleted.
5. **DO NOT** make up API behaviors, error codes, or response shapes that aren't in the code.
6. **DO NOT** skip spec regeneration. Always run the generation script after updating annotations to ensure specs reflect the latest code.
7. **DO NOT** hand-write endpoint tables or schema details in API reference pages. Let OAD generate them from the spec.
