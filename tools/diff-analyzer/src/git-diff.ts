import { execFileSync } from "child_process";

export interface GitDiffOptions {
  /** PR number — resolves to the PR's branch via `git ls-remote` */
  pr?: number;
  /** Branch name to diff against main */
  branch?: string;
  /** Base branch to compare against (default: "main") */
  base?: string;
  /** Working directory for git commands (default: cwd) */
  cwd?: string;
}

/**
 * Resolves a PR number to its head branch name by querying git ls-remote
 * for refs matching `pull/<number>/head`.
 */
export function resolvePRBranch(pr: number, cwd: string): string {
  const remoteLine = execFileSync(
    "git", ["ls-remote", "--refs", "origin", `pull/${pr}/head`],
    { cwd, encoding: "utf-8", timeout: 15000 }
  ).trim();

  if (remoteLine) {
    execFileSync(
      "git", ["fetch", "origin", `pull/${pr}/head:refs/pr/${pr}`],
      { cwd, encoding: "utf-8", timeout: 30000, stdio: ["pipe", "pipe", "pipe"] }
    );
    return `refs/pr/${pr}`;
  }

  const branches = execFileSync(
    "git", ["branch", "-r", "--list", "origin/*"],
    { cwd, encoding: "utf-8", timeout: 15000 }
  ).trim();

  const prSuffix = new RegExp(`/pr-${pr}(?:\\b|-)|\/pr/${pr}(?:\\b|/)`);
  const branchLines = branches.split("\n").map((b) => b.trim());
  for (const branch of branchLines) {
    if (prSuffix.test(branch)) {
      return branch.replace(/^origin\//, "");
    }
  }

  throw new Error(
    `Could not resolve PR #${pr} to a branch. ` +
      `Try using --branch <branch-name> instead.`
  );
}

/**
 * Fetches the latest refs for a branch from the remote.
 */
export function fetchBranch(branch: string, cwd: string): void {
  if (branch.startsWith("refs/")) return;

  try {
    execFileSync("git", ["fetch", "origin", branch], {
      cwd,
      encoding: "utf-8",
      timeout: 30000,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    // Branch might already be local, continue
  }
}

/**
 * Finds the merge-base between two refs.
 */
export function findMergeBase(base: string, head: string, cwd: string): string {
  try {
    return execFileSync("git", ["merge-base", `origin/${base}`, head], {
      cwd,
      encoding: "utf-8",
      timeout: 15000,
    }).trim();
  } catch {
    return execFileSync("git", ["merge-base", base, head], {
      cwd,
      encoding: "utf-8",
      timeout: 15000,
    }).trim();
  }
}

/**
 * Generates a unified diff string using git, given a PR number or branch name.
 * This is the main entry point for the git diff generation feature.
 *
 * Supports two modes:
 * 1. `--pr <number>` — resolves the PR to a branch, fetches it, diffs against base
 * 2. `--branch <name>` — diffs the named branch against base
 *
 * In both cases, uses `git diff <merge-base>...<head>` (three-dot) to get
 * only the changes introduced by the branch.
 */
export function generateDiff(options: GitDiffOptions): string {
  const cwd = options.cwd ?? process.cwd();
  const base = options.base ?? "main";

  let headRef: string;

  if (options.pr !== undefined) {
    headRef = resolvePRBranch(options.pr, cwd);
  } else if (options.branch) {
    headRef = options.branch;
    fetchBranch(headRef, cwd);
  } else {
    throw new Error("Either --pr or --branch must be specified");
  }

  // Fetch latest base
  fetchBranch(base, cwd);

  // Resolve head to the right ref
  const resolvedHead = headRef.startsWith("refs/")
    ? headRef
    : `origin/${headRef}`;

  // Use merge-base for a clean three-dot diff
  const mergeBase = findMergeBase(base, resolvedHead, cwd);

  const diff = execFileSync("git", ["diff", mergeBase, resolvedHead], {
    cwd,
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
    timeout: 30000,
  });

  if (!diff.trim()) {
    throw new Error(
      `No diff found between ${base} and ${headRef}. ` +
        `The branch may already be merged or identical to ${base}.`
    );
  }

  return diff;
}
