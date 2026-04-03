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

### Step 2: Run the Diff Analyzer CLI (with Action Plan)

The CLI generates the diff AND a deterministic action plan when given `--domain-map`. This pre-computes which specs to regenerate, which concern groups to process, and which update path (A/B/both) each group needs. **You follow the action plan — you do not decide these things yourself.**

```bash
cd tools/diff-analyzer
# From a PR number (recommended):
npx ts-node src/cli.ts --pr <number> --repo /path/to/repo --domain-map /path/to/repo/docs/domain-map.yaml --pretty > /tmp/diff-analysis.json
# Or from a branch name:
npx ts-node src/cli.ts --branch <branch-name> --repo /path/to/repo --domain-map /path/to/repo/docs/domain-map.yaml --pretty > /tmp/diff-analysis.json
```

The output JSON now includes an `actionPlan` field with:
- `affectedSpecs` — which specs need regeneration (and which changed sources triggered it)
- `concernGroups` — pre-grouped concerns with doc pages, update path (`A`/`B`/`both`), and tagged specs
- `unmappedFiles` — files that don't map to any domain-map entry (may need manual review)
- `hasNewController` — whether any concern group involves a new unmapped controller

See `.agents/skills/diff-analyzer/SKILL.md` for full output shape and all options.

### Step 3: Read the Action Plan

The `actionPlan` in the CLI output replaces manual noise filtering, domain-map cross-referencing, and concern grouping. Read it and follow its instructions:

1. **If `actionPlan.concernGroups` is empty AND `actionPlan.unmappedFiles` is empty** → **STOP**. Report "No documentation impact detected" and exit.
2. **If `actionPlan.concernGroups` has more than 7 entries** → **STOP**. Report that the PR is too complex.
3. **For each concern group**, the `path` field tells you which update path to follow: `"A"` (annotations → specs), `"B"` (narrative markdown), or `"both"`.
4. **`actionPlan.affectedSpecs`** tells you exactly which specs to regenerate — skip specs not in this list.
5. **`actionPlan.hasNewController`** tells you if you need to create new doc pages and update `domain-map.yaml`.
6. **`actionPlan.unmappedFiles`** lists non-noise files that don't map to any domain-map entry — review these for potential doc impact.

**You do NOT need to manually filter noise or group by concern.** The CLI has already done this deterministically.

### Step 6: Update Docs for Each Concern-Group

Process each concern-group sequentially. For each group, determine which path to follow:

#### Path A: API-Affecting Changes (annotations → specs → OAD)

If the concern-group involves route handlers, controllers, request/response types, or endpoint behavior:

1. **Read the changed source files** from the PR branch
2. **Update source code annotations** to reflect the changes:
   - **Read `.agents/skills/annotation-language/SKILL.md` first** — this defines the writing style, language quality, and examples you MUST follow for all annotations. Every summary, description, error message, and parameter description must meet the standards in that skill.
   - **Express (TypeScript):** Update JSDoc `@openapi` comment blocks above route handlers.
     See `.agents/skills/express-openapi/SKILL.md` for structural patterns.
     ```
     /**
      * @openapi
      * /api/claims/{claimNumber}/status:
      *   patch:
      *     summary: Transition claim to a new status
      *     description: |
      *       Transitions a claim to a new status. Only certain transitions are allowed:
      *       - submitted -> under_review, denied
      *       - under_review -> approved, denied
      *       ...
      *     tags: [Claims]
      *     operationId: transitionClaimStatus
      *     parameters: ...
      *     responses:
      *       200:
      *         description: Claim status updated successfully
      *       409:
      *         description: Invalid status transition (e.g. cannot move from "closed" to "approved")
      */
     ```
   - **Spring Boot (Java):** Update `@Operation`, `@ApiResponse`, `@Schema`, `@Parameter` annotations.
     See `.agents/skills/java-openapi/SKILL.md` for structural patterns.
     ```java
     @Operation(summary = "Send email notification", description = "Sends a templated email to the specified recipient. Validates the template exists and the recipient address is well-formed.")
     @ApiResponse(responseCode = "200", description = "Email queued for delivery")
     @ApiResponse(responseCode = "400", description = "Invalid recipient address or unknown template ID")
     ```
   - If an endpoint was **added** → add full annotation block (with operationId, descriptions, examples)
   - If an endpoint was **removed** → remove its annotation block
   - If request/response shapes changed → update the annotation schemas
   - If behavior changed → update summary/description text in annotations
3. **Regenerate OpenAPI specs** — but ONLY if `actionPlan.affectedSpecs` includes specs for this group:
   - Check the concern group's `specs` array — only regenerate those specs
   - If no specs are listed for this group, skip regeneration entirely
   - Run the generation script:
     ```bash
     ./scripts/generate-openapi-specs.sh
     ```
     This starts Express (port 3000) and Spring Boot (port 8080), fetches the live OpenAPI specs, saves them to `docs/docs/specs/`, and shuts down the servers.
   - **Skip regeneration for specs NOT in `actionPlan.affectedSpecs`.** For example, if only Express files changed, do NOT regenerate the Spring Boot spec.
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
4. **Update freshness stamps** on every doc page you touched (see Freshness Stamps section below)

#### Both Paths

**Update freshness stamps** on every doc page you modified (Path A API pages AND Path B narrative pages). See the Freshness Stamps section below for format and rules.

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

### Step 7: Commit and Create PR

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

### Step 8: Assess Confidence and Decide

Calculate overall confidence = **lowest confidence across all groups**.

| Overall Confidence | Action |
|-------------------|--------|
| **HIGH** | Auto-submit the PR. Add label `auto-docs`. Comment on the original PR: "Docs updated automatically. See PR#X." |
| **MEDIUM** | Submit the PR but flag for review. Add label `docs-review-requested`. Comment: "Docs updated with medium confidence. Please review PR#X, particularly: [list MEDIUM groups]." |
| **LOW** | Submit the PR as draft. Add label `docs-needs-review`. Comment: "Docs update drafted with low confidence. Human review required for PR#X. Uncertain areas: [list LOW groups with reasons]." |

### Step 9: Report

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
8. **Freshness stamps** are updated on every doc page that was modified

### API page format (OAD-based):

API reference pages use the neoteroi OAD plugin to auto-render from OpenAPI specs. A typical API page looks like:

```markdown
# Controller Name

<!-- doc-freshness: { "commit": "abc1234", "date": "2026-04-02", "updatedBy": "devin-ai-integration[bot]", "pr": 19 } -->

!!! info "Last updated: 2026-04-02 | commit `abc1234` | by devin-ai-integration[bot] | PR #19"

**Base URL:** `http://localhost:PORT`
**Source:** `path/to/source/`

Brief description of the controller's purpose.

## Controllers

| Controller | Base Path | Concern |
|-----------|-----------|---------|
| Name | `/api/path` | Description |

---

## API Reference

::OAD(../specs/<spec-file>.json)
```

**Do NOT hand-write endpoint tables, request/response examples, or schema details.** The OAD plugin generates all of this from the spec. Your job is to keep the annotations accurate so the generated spec is correct.

---

### Freshness Stamps

Every doc page has a **freshness stamp** — a machine-readable HTML comment and a visible MkDocs admonition that tracks when the page was last updated.

**Format (two lines, always together):**

```markdown
<!-- doc-freshness: { "commit": "<short-sha>", "date": "<YYYY-MM-DD>", "updatedBy": "<author>", "pr": <number> } -->

!!! info "Last updated: <YYYY-MM-DD> | commit `<short-sha>` | by <author> | PR #<number>"
```

**Placement:** Immediately after the `# Title` heading, before any content.

**Rules:**
1. **Update the stamp on every doc page you modify.** If you touched the file, update the stamp.
2. **Use the PR number** of the docs PR you are creating (not the original code PR).
3. **Use the short SHA** (first 7 chars) of your docs commit.
4. **Date must be passed explicitly** as `YYYY-MM-DD` in UTC. Use `date -u +%Y-%m-%d` to get today's date.
5. **updatedBy** is the agent or user who made the update (e.g. `devin-ai-integration[bot]`).
6. **Do NOT update stamps on pages you didn't change.** Only modified pages get fresh stamps.
7. If creating a **new doc page**, add the stamp immediately after the title heading.
8. The HTML comment is for **machine parsing** (auditing freshness across all pages). The admonition is for **human readers**.

---

## Skills Reference

The following skill files define the annotation patterns you must follow. **Read all relevant skills before writing any annotations:**

- **Annotation Language & Style:** `.agents/skills/annotation-language/SKILL.md` — **READ THIS FIRST.** Defines writing quality standards: how to write summaries, descriptions, error messages, parameter descriptions, and operationIds. Includes before/after examples and anti-patterns.
- **Express (TypeScript):** `.agents/skills/express-openapi/SKILL.md` — JSDoc `@openapi` comment blocks with swagger syntax (structural patterns)
- **Spring Boot (Java):** `.agents/skills/java-openapi/SKILL.md` — `@Operation`, `@ApiResponse`, `@Schema`, `@Parameter` annotations (structural patterns)

---

## Advice

- **Annotations live with the code.** This is a design principle. Docs are not separate from code — they're embedded in it as annotations. Any agent that touches the code can keep docs in sync.
- **Read existing annotations first.** Before modifying, read existing annotation blocks in the same file to understand the style and level of detail. Then read `.agents/skills/annotation-language/SKILL.md` to ensure your new annotations meet the quality bar.
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
8. **DO NOT** hand-edit auto-generated files. Files with an `x-generated` field at the top are produced by scripts and will be overwritten on the next regeneration. To update them, modify the source (annotations) and re-run the generation script.

---

## Auto-Generated Files

The following files are **auto-generated** and must NOT be edited by hand. They contain an `x-generated` metadata field (OpenAPI extension) marking them as such.

| File | Generated by | Source of truth |
|------|-------------|-----------------|
| `docs/docs/specs/express-openapi.json` | `scripts/generate-openapi-specs.sh` | `@openapi` JSDoc in `javascript/src/routes/*.ts` |
| `docs/docs/specs/springboot-openapi.json` | `scripts/generate-openapi-specs.sh` | `@Operation`/`@Schema` annotations in `java/src/.../controller/*.java` |

To update a spec: edit the source annotations → run `./scripts/generate-openapi-specs.sh` → commit the regenerated JSON.
