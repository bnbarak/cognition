# SKILL: Diff Analyzer CLI

## Purpose

Deterministic CLI that parses unified Git diffs and produces structured JSON describing what changed. This is the first step of the doc-update agent pipeline — it provides a machine-readable change manifest that the LLM agent uses to decide what docs/specs need updating.

**This tool is purely deterministic (regex-based). It does NOT use LLMs.**

---

## Installation

```bash
cd tools/diff-analyzer
npm install
```

---

## Usage

### From a PR number (recommended)

```bash
cd tools/diff-analyzer
npx ts-node src/cli.ts --pr 5 --pretty
npx ts-node src/cli.ts --pr 5 --repo /path/to/repo --pretty
```

This automatically fetches the PR branch, computes the merge-base against `main`, and generates the diff.

### From a branch name

```bash
cd tools/diff-analyzer
npx ts-node src/cli.ts --branch devin/1775067018-core-logic-changes --pretty
npx ts-node src/cli.ts --branch feature --base develop --repo /path/to/repo --pretty
```

### From a diff file

```bash
npx ts-node src/cli.ts <diff-file> [--pretty]
```

### From stdin (piped from git)

```bash
git diff main...feature-branch | npx ts-node src/cli.ts - --pretty
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--pr <number>` | Generate diff from a GitHub PR number | — |
| `--branch <name>` | Generate diff from a branch name | — |
| `--base <branch>` | Base branch to diff against | `main` |
| `--repo <path>` | Path to the git repository | cwd |
| `--domain-map <path>` | Path to `domain-map.yaml` — enables `actionPlan` in output | — |
| `--pretty` | Pretty-print JSON output | off |

---

## Output Shape

```typescript
interface DiffAnalysis {
  pr: {
    totalFiles: number;
    totalAdditions: number;
    totalDeletions: number;
    hasNewFiles: boolean;
    hasDeletedFiles: boolean;
    hasSpecChanges: boolean;
    hasRouteChanges: boolean;
    hasTypeChanges: boolean;
  };
  files: Array<{
    path: string;
    status: "modified" | "added" | "deleted" | "renamed";
    classification: "route" | "type" | "spec" | "config" | "doc" | "unknown";
    additions: number;
    deletions: number;
    totalChanges: number;
    hunks: Array<{
      oldStart: number;
      oldCount: number;
      newStart: number;
      newCount: number;
    }>;
    domainMatches: [];  // Always empty from CLI; agent enriches later
  }>;
  actionPlan?: ActionPlan;  // Present when --domain-map is provided
}

interface ActionPlan {
  /** Which specs need regeneration based on changed files */
  affectedSpecs: Array<{
    spec: string;        // e.g. "docs/docs/specs/express-openapi.json"
    generator: string;   // e.g. "scripts/generate-openapi-specs.sh"
    changedSources: string[];  // Source files that triggered this
  }>;
  /** Files that don't map to any domain-map entry (noise already filtered) */
  unmappedFiles: string[];
  /** Whether any unmapped file looks like a new controller */
  hasNewController: boolean;
}
```

---

## File Classification Rules

| Pattern | Classification |
|---------|---------------|
| `javascript/src/routes/*.ts` | `route` |
| `java/**/controller/*.java` | `route` |
| `javascript/src/types/*.ts` | `type` |
| `java/**/model/*.java` | `type` |
| `specs/*.json` | `spec` |
| `docs/**/*.md` | `doc` |
| `javascript/src/app.ts` | `config` |
| `docs/mkdocs.yml` | `config` |
| `java/pom.xml` | `config` |
| `AGENTS.md` | `config` |
| `docs/domain-map.yaml` | `config` |
| Everything else | `unknown` |

---

## How the Agent Should Use This

1. Run the CLI with `--pr` or `--branch` **and `--domain-map`** to get the structured JSON with a pre-computed action plan
2. Read `actionPlan.affectedSpecs` — only regenerate these specs (skip the rest)
3. Check `actionPlan.hasNewController` — if true, create new doc pages and update `domain-map.yaml`
4. Review `actionPlan.unmappedFiles` — these may need manual doc impact assessment
5. Read `docs/domain-map.yaml` and group concerns yourself based on the file-to-doc mappings
6. The `pr` summary flags (`hasRouteChanges`, `hasSpecChanges`, etc.) provide quick scope overview

**Without `--domain-map`:** The CLI outputs only the base `pr` + `files` JSON (no action plan). The agent must manually cross-reference the domain map.

---

## Running Tests

```bash
cd tools/diff-analyzer
npm test
```

Test fixtures are in `__tests__/fixtures/` (diff4.txt, diff5.txt, diff6.txt from PRs #4, #5, #6).

---

## Extending Classification Rules

To add new classification patterns, edit `src/classifier.ts`. Add a new entry to the `RULES` array with a regex pattern and classification. Rules are evaluated top-to-bottom; first match wins.
