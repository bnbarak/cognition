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

### From a diff file

```bash
npx ts-node src/cli.ts <diff-file> [--pretty]
```

### From stdin (piped from git)

```bash
git diff main...feature-branch | npx ts-node src/cli.ts - --pretty
```

### Generate a diff from a PR branch

```bash
git diff main...<branch-name> > /tmp/diff.txt
npx ts-node src/cli.ts /tmp/diff.txt --pretty
```

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
| `domain-map.yaml` | `config` |
| Everything else | `unknown` |

---

## How the Agent Should Use This

1. Run the CLI on the PR diff to get the structured JSON
2. Read `domain-map.yaml` from the repo
3. Cross-reference each `file.path` against `domain-map.yaml` sources
4. Use `file.hunks` line ranges to check overlap with `domain-map.yaml` line ranges
5. Build the list of docs/specs that need updating
6. The `pr` summary flags (`hasRouteChanges`, `hasSpecChanges`, etc.) help determine scope

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
