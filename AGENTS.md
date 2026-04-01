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
cd tools/diff-analyzer && npx ts-node src/cli.ts <diff-file> --pretty
```

See `.agents/skills/diff-analyzer/SKILL.md` for full documentation.

### Domain Mapping

Source of truth: `domain-map.yaml` in repo root.
See `.agents/skills/update-domain-mapping/SKILL.md` for update procedures.

## TODO

- [ ] Add CI/CD configuration
- [ ] Build `!doc-update` playbook
- [ ] Add confidence framework for auto-submit vs review
