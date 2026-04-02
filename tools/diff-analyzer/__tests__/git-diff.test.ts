import { execFileSync } from "child_process";
import { resolvePRBranch, fetchBranch, findMergeBase, generateDiff } from "../src/git-diff";

jest.mock("child_process", () => ({
  execFileSync: jest.fn(),
}));

const mockExecFileSync = execFileSync as jest.MockedFunction<typeof execFileSync>;

beforeEach(() => {
  mockExecFileSync.mockReset();
});

describe("resolvePRBranch", () => {
  it("fetches PR ref when ls-remote finds a match", () => {
    mockExecFileSync
      .mockReturnValueOnce("abc123\trefs/pull/5/head\n")
      .mockReturnValueOnce("");

    const result = resolvePRBranch(5, "/repo");

    expect(result).toBe("refs/pr/5");
    expect(mockExecFileSync).toHaveBeenCalledTimes(2);
    expect(mockExecFileSync).toHaveBeenCalledWith(
      "git", ["ls-remote", "--refs", "origin", "pull/5/head"],
      expect.objectContaining({ cwd: "/repo" })
    );
    expect(mockExecFileSync).toHaveBeenCalledWith(
      "git", ["fetch", "origin", "pull/5/head:refs/pr/5"],
      expect.objectContaining({ cwd: "/repo" })
    );
  });

  it("falls back to searching remote branches when ls-remote returns empty", () => {
    mockExecFileSync
      .mockReturnValueOnce("")
      .mockReturnValueOnce(
        "  origin/main\n  origin/devin/pr-5-feature\n  origin/other\n"
      );

    const result = resolvePRBranch(5, "/repo");

    expect(result).toBe("devin/pr-5-feature");
  });

  it("does not match substring PR numbers in fallback", () => {
    mockExecFileSync
      .mockReturnValueOnce("")
      .mockReturnValueOnce(
        "  origin/main\n  origin/devin/pr-50-feature\n  origin/other\n"
      );

    expect(() => resolvePRBranch(5, "/repo")).toThrow(
      "Could not resolve PR #5 to a branch"
    );
  });

  it("throws when PR cannot be resolved", () => {
    mockExecFileSync
      .mockReturnValueOnce("")
      .mockReturnValueOnce("  origin/main\n  origin/feature\n");

    expect(() => resolvePRBranch(99, "/repo")).toThrow(
      "Could not resolve PR #99 to a branch"
    );
  });
});

describe("fetchBranch", () => {
  it("fetches a regular branch from origin", () => {
    mockExecFileSync.mockReturnValueOnce("");

    fetchBranch("feature-branch", "/repo");

    expect(mockExecFileSync).toHaveBeenCalledWith(
      "git", ["fetch", "origin", "feature-branch"],
      expect.objectContaining({ cwd: "/repo" })
    );
  });

  it("skips fetch for refs/ prefixed branches", () => {
    fetchBranch("refs/pr/5", "/repo");

    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it("does not throw when fetch fails (branch might be local)", () => {
    mockExecFileSync.mockImplementationOnce(() => {
      throw new Error("fatal: couldn't find remote ref");
    });

    expect(() => fetchBranch("nonexistent", "/repo")).not.toThrow();
  });
});

describe("findMergeBase", () => {
  it("finds merge-base using origin/ prefix on base", () => {
    mockExecFileSync.mockReturnValueOnce("abc123def\n");

    const result = findMergeBase("main", "refs/pr/5", "/repo");

    expect(result).toBe("abc123def");
    expect(mockExecFileSync).toHaveBeenCalledWith(
      "git", ["merge-base", "origin/main", "refs/pr/5"],
      expect.objectContaining({ cwd: "/repo" })
    );
  });

  it("falls back to no-prefix when origin/ fails", () => {
    mockExecFileSync
      .mockImplementationOnce(() => {
        throw new Error("fatal: not a valid object");
      })
      .mockReturnValueOnce("def456\n");

    const result = findMergeBase("main", "feature", "/repo");

    expect(result).toBe("def456");
    expect(mockExecFileSync).toHaveBeenCalledTimes(2);
    expect(mockExecFileSync).toHaveBeenLastCalledWith(
      "git", ["merge-base", "main", "feature"],
      expect.objectContaining({ cwd: "/repo" })
    );
  });
});

describe("generateDiff", () => {
  it("generates diff from a branch name", () => {
    mockExecFileSync
      .mockReturnValueOnce("")
      .mockReturnValueOnce("")
      .mockReturnValueOnce("abc123\n")
      .mockReturnValueOnce("diff --git a/file.ts b/file.ts\n+added line\n");

    const result = generateDiff({ branch: "feature", base: "main", cwd: "/repo" });

    expect(result).toContain("diff --git");
    expect(mockExecFileSync).toHaveBeenCalledWith(
      "git", ["diff", "abc123", "origin/feature"],
      expect.objectContaining({ cwd: "/repo" })
    );
  });

  it("generates diff from a PR number", () => {
    mockExecFileSync
      .mockReturnValueOnce("abc123\trefs/pull/5/head\n")
      .mockReturnValueOnce("")
      .mockReturnValueOnce("")
      .mockReturnValueOnce("merge123\n")
      .mockReturnValueOnce("diff --git a/route.ts b/route.ts\n+new endpoint\n");

    const result = generateDiff({ pr: 5, base: "main", cwd: "/repo" });

    expect(result).toContain("diff --git");
    expect(mockExecFileSync).toHaveBeenCalledWith(
      "git", ["diff", "merge123", "refs/pr/5"],
      expect.objectContaining({ cwd: "/repo" })
    );
  });

  it("throws when neither --pr nor --branch is specified", () => {
    expect(() => generateDiff({ cwd: "/repo" })).toThrow(
      "Either --pr or --branch must be specified"
    );
  });

  it("throws when diff is empty", () => {
    mockExecFileSync
      .mockReturnValueOnce("")
      .mockReturnValueOnce("")
      .mockReturnValueOnce("abc123\n")
      .mockReturnValueOnce("");

    expect(() =>
      generateDiff({ branch: "feature", base: "main", cwd: "/repo" })
    ).toThrow("No diff found");
  });

  it("uses 'main' as default base branch", () => {
    mockExecFileSync
      .mockReturnValueOnce("")
      .mockReturnValueOnce("")
      .mockReturnValueOnce("abc123\n")
      .mockReturnValueOnce("diff --git a/f.ts b/f.ts\n");

    generateDiff({ branch: "feature", cwd: "/repo" });

    expect(mockExecFileSync).toHaveBeenCalledWith(
      "git", ["merge-base", "origin/main", "origin/feature"],
      expect.objectContaining({ cwd: "/repo" })
    );
  });

  it("uses cwd as default working directory", () => {
    const originalCwd = process.cwd();
    mockExecFileSync
      .mockReturnValueOnce("")
      .mockReturnValueOnce("")
      .mockReturnValueOnce("abc123\n")
      .mockReturnValueOnce("diff --git a/f.ts b/f.ts\n");

    generateDiff({ branch: "feature" });

    expect(mockExecFileSync).toHaveBeenCalledWith(
      "git",
      expect.any(Array),
      expect.objectContaining({ cwd: originalCwd })
    );
  });
});
