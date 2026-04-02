import { execSync } from "child_process";
import { resolvePRBranch, fetchBranch, findMergeBase, generateDiff } from "../src/git-diff";

// Mock child_process.execSync
jest.mock("child_process", () => ({
  execSync: jest.fn(),
}));

const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

beforeEach(() => {
  mockExecSync.mockReset();
});

describe("resolvePRBranch", () => {
  it("fetches PR ref when ls-remote finds a match", () => {
    mockExecSync
      .mockReturnValueOnce("abc123\trefs/pull/5/head\n") // ls-remote
      .mockReturnValueOnce(""); // fetch

    const result = resolvePRBranch(5, "/repo");

    expect(result).toBe("refs/pr/5");
    expect(mockExecSync).toHaveBeenCalledTimes(2);
    expect(mockExecSync).toHaveBeenCalledWith(
      'git ls-remote --refs origin "pull/5/head"',
      expect.objectContaining({ cwd: "/repo" })
    );
    expect(mockExecSync).toHaveBeenCalledWith(
      "git fetch origin pull/5/head:refs/pr/5",
      expect.objectContaining({ cwd: "/repo" })
    );
  });

  it("falls back to searching remote branches when ls-remote returns empty", () => {
    mockExecSync
      .mockReturnValueOnce("") // ls-remote returns nothing
      .mockReturnValueOnce(
        "  origin/main\n  origin/devin/pr-5-feature\n  origin/other\n"
      ); // branch -r

    const result = resolvePRBranch(5, "/repo");

    expect(result).toBe("devin/pr-5-feature");
  });

  it("throws when PR cannot be resolved", () => {
    mockExecSync
      .mockReturnValueOnce("") // ls-remote returns nothing
      .mockReturnValueOnce("  origin/main\n  origin/feature\n"); // no matching branch

    expect(() => resolvePRBranch(99, "/repo")).toThrow(
      "Could not resolve PR #99 to a branch"
    );
  });
});

describe("fetchBranch", () => {
  it("fetches a regular branch from origin", () => {
    mockExecSync.mockReturnValueOnce("");

    fetchBranch("feature-branch", "/repo");

    expect(mockExecSync).toHaveBeenCalledWith(
      "git fetch origin feature-branch",
      expect.objectContaining({ cwd: "/repo" })
    );
  });

  it("skips fetch for refs/ prefixed branches", () => {
    fetchBranch("refs/pr/5", "/repo");

    expect(mockExecSync).not.toHaveBeenCalled();
  });

  it("does not throw when fetch fails (branch might be local)", () => {
    mockExecSync.mockImplementationOnce(() => {
      throw new Error("fatal: couldn't find remote ref");
    });

    expect(() => fetchBranch("nonexistent", "/repo")).not.toThrow();
  });
});

describe("findMergeBase", () => {
  it("finds merge-base using origin/ prefix on base", () => {
    mockExecSync.mockReturnValueOnce("abc123def\n");

    const result = findMergeBase("main", "refs/pr/5", "/repo");

    expect(result).toBe("abc123def");
    expect(mockExecSync).toHaveBeenCalledWith(
      "git merge-base origin/main refs/pr/5",
      expect.objectContaining({ cwd: "/repo" })
    );
  });

  it("falls back to no-prefix when origin/ fails", () => {
    mockExecSync
      .mockImplementationOnce(() => {
        throw new Error("fatal: not a valid object");
      })
      .mockReturnValueOnce("def456\n");

    const result = findMergeBase("main", "feature", "/repo");

    expect(result).toBe("def456");
    expect(mockExecSync).toHaveBeenCalledTimes(2);
    expect(mockExecSync).toHaveBeenLastCalledWith(
      "git merge-base main feature",
      expect.objectContaining({ cwd: "/repo" })
    );
  });
});

describe("generateDiff", () => {
  it("generates diff from a branch name", () => {
    mockExecSync
      .mockReturnValueOnce("") // fetchBranch (head)
      .mockReturnValueOnce("") // fetchBranch (base)
      .mockReturnValueOnce("abc123\n") // merge-base
      .mockReturnValueOnce("diff --git a/file.ts b/file.ts\n+added line\n"); // git diff

    const result = generateDiff({ branch: "feature", base: "main", cwd: "/repo" });

    expect(result).toContain("diff --git");
    expect(mockExecSync).toHaveBeenCalledWith(
      "git diff abc123 origin/feature",
      expect.objectContaining({ cwd: "/repo" })
    );
  });

  it("generates diff from a PR number", () => {
    mockExecSync
      .mockReturnValueOnce("abc123\trefs/pull/5/head\n") // ls-remote
      .mockReturnValueOnce("") // fetch PR ref
      .mockReturnValueOnce("") // fetchBranch (base)
      .mockReturnValueOnce("merge123\n") // merge-base
      .mockReturnValueOnce("diff --git a/route.ts b/route.ts\n+new endpoint\n"); // git diff

    const result = generateDiff({ pr: 5, base: "main", cwd: "/repo" });

    expect(result).toContain("diff --git");
    expect(mockExecSync).toHaveBeenCalledWith(
      "git diff merge123 refs/pr/5",
      expect.objectContaining({ cwd: "/repo" })
    );
  });

  it("throws when neither --pr nor --branch is specified", () => {
    expect(() => generateDiff({ cwd: "/repo" })).toThrow(
      "Either --pr or --branch must be specified"
    );
  });

  it("throws when diff is empty", () => {
    mockExecSync
      .mockReturnValueOnce("") // fetchBranch (head)
      .mockReturnValueOnce("") // fetchBranch (base)
      .mockReturnValueOnce("abc123\n") // merge-base
      .mockReturnValueOnce(""); // empty diff

    expect(() =>
      generateDiff({ branch: "feature", base: "main", cwd: "/repo" })
    ).toThrow("No diff found");
  });

  it("uses 'main' as default base branch", () => {
    mockExecSync
      .mockReturnValueOnce("") // fetchBranch (head)
      .mockReturnValueOnce("") // fetchBranch (base)
      .mockReturnValueOnce("abc123\n") // merge-base
      .mockReturnValueOnce("diff --git a/f.ts b/f.ts\n"); // diff

    generateDiff({ branch: "feature", cwd: "/repo" });

    // Check that merge-base used origin/main
    expect(mockExecSync).toHaveBeenCalledWith(
      "git merge-base origin/main origin/feature",
      expect.objectContaining({ cwd: "/repo" })
    );
  });

  it("uses cwd as default working directory", () => {
    const originalCwd = process.cwd();
    mockExecSync
      .mockReturnValueOnce("") // fetchBranch (head)
      .mockReturnValueOnce("") // fetchBranch (base)
      .mockReturnValueOnce("abc123\n") // merge-base
      .mockReturnValueOnce("diff --git a/f.ts b/f.ts\n"); // diff

    generateDiff({ branch: "feature" });

    expect(mockExecSync).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ cwd: originalCwd })
    );
  });
});
