# AGENTS.md

## Project Overview

InsureCRM — a CRM platform for insurance agencies. This monorepo contains:

- `/javascript` — TypeScript / Express API (auth + client management + COI)
- `/java` — Java / Spring Boot email service
- `/docs` — MkDocs documentation site
- `/tools/diff-analyzer` — Deterministic diff parser CLI (TypeScript)

## Testing Conventions

### AAA Pattern (Arrange-Act-Assert)

All unit tests **must** follow the AAA pattern with these rules:

1. **No comments** anywhere in the test body — the structure speaks for itself
2. **Two blank lines** to separate sections: one between Arrange/Act, one between Act/Assert
3. **Method naming**: `functionName_specificCase` (e.g., `parseGitDiff_emptyDiff`, `classifyFile_expressRoute`)

#### Example

```typescript
test("parseGitDiff_singleFileModification", () => {
  const diff = [
    "diff --git a/src/app.ts b/src/app.ts",
    "--- a/src/app.ts",
    "+++ b/src/app.ts",
    "@@ -10,4 +10,5 @@",
    "+const HOST = '0.0.0.0';",
  ].join("\n");

  const result = parseGitDiff(diff);

  expect(result.pr.totalFiles).toBe(1);
  expect(result.files[0].status).toBe("modified");
});
```

#### Anti-patterns

- `// Arrange` / `// Act` / `// Assert` comments — **forbidden**
- More or fewer than two blank lines between sections
- Generic names like `test1`, `shouldWork`, `happyPath`
- Assertions that force outcomes instead of validating real behavior

### Test Validation

When writing tests against fixture data (e.g., diff files):
- Count additions/deletions manually from the fixture to derive expected values
- Do not hardcode expected values without verifying them against the source
- Assertions must be legitimate — they must fail if the code is broken

## Agent Tools

### diff-analyzer CLI

Located at `tools/diff-analyzer/`. Parses unified Git diffs into structured JSON.

```bash
cd tools/diff-analyzer
# From a PR number:
npx ts-node src/cli.ts --pr 5 --pretty
# From a branch:
npx ts-node src/cli.ts --branch feature-branch --pretty
# From a diff file:
npx ts-node src/cli.ts <diff-file> --pretty
```

See `.agents/skills/diff-analyzer/SKILL.md` for full documentation.

### Domain Mapping

Source of truth: `docs/domain-map.yaml`.
See `.agents/skills/update-domain-mapping/SKILL.md` for update procedures.

## Playbooks

### `!doc-update` — Automated Documentation & Spec Updater

The main orchestration playbook for the doc-update agent. Triggered with `!doc-update PR#<number>`.

**Flow:** Run diff-analyzer CLI (`--pr` or `--branch`) → Read domain map → Filter noise → Group by concern → Update docs per group (Path A: annotations → regen specs → OAD renders; Path B: edit narrative markdown) → Assess confidence → Create PR

**Confidence framework:**
- HIGH → auto-submit with `auto-docs` label
- MEDIUM → submit but flag for review with `docs-review-requested` label
- LOW → submit as draft with `docs-needs-review` label

Full playbook: `.agents/playbooks/doc-update.md`
Devin playbook ID: `playbook-b62b896ebcbc4ffcbef343b6f10df480`

## TODO

- [ ] Add CI/CD configuration
- [ ] Test `!doc-update` playbook on PR #4, #5, #6
- [ ] Graduate to coordinator + child session architecture (Phase 2)
