import * as fs from "fs";
import * as path from "path";
import { parseGitDiff } from "../src/parser";

const fixturesDir = path.join(__dirname, "fixtures");

function readFixture(name: string): string {
  return fs.readFileSync(path.join(fixturesDir, name), "utf-8");
}

describe("parseGitDiff", () => {
  test("parseGitDiff_emptyDiff", () => {
    const result = parseGitDiff("");

    expect(result.pr.totalFiles).toBe(0);
    expect(result.files).toHaveLength(0);
  });

  test("parseGitDiff_singleFileModification", () => {
    const diff = [
      "diff --git a/src/app.ts b/src/app.ts",
      "index 1234567..abcdefg 100644",
      "--- a/src/app.ts",
      "+++ b/src/app.ts",
      "@@ -10,4 +10,5 @@ const app = express();",
      " const PORT = 3000;",
      "+const HOST = '0.0.0.0';",
      " app.listen(PORT);",
    ].join("\n");

    const result = parseGitDiff(diff);

    expect(result.pr.totalFiles).toBe(1);
    expect(result.pr.totalAdditions).toBe(1);
    expect(result.pr.totalDeletions).toBe(0);
    expect(result.files[0].path).toBe("src/app.ts");
    expect(result.files[0].status).toBe("modified");
    expect(result.files[0].additions).toBe(1);
    expect(result.files[0].deletions).toBe(0);
  });

  test("parseGitDiff_fileAddition", () => {
    const diff = [
      "diff --git a/src/new-file.ts b/src/new-file.ts",
      "new file mode 100644",
      "index 0000000..abcdefg",
      "--- /dev/null",
      "+++ b/src/new-file.ts",
      "@@ -0,0 +1,3 @@",
      "+import express from 'express';",
      "+const router = express.Router();",
      "+export default router;",
    ].join("\n");

    const result = parseGitDiff(diff);

    expect(result.pr.hasNewFiles).toBe(true);
    expect(result.files[0].status).toBe("added");
    expect(result.files[0].additions).toBe(3);
    expect(result.files[0].deletions).toBe(0);
  });

  test("parseGitDiff_fileDeletion", () => {
    const diff = [
      "diff --git a/src/old-file.ts b/src/old-file.ts",
      "deleted file mode 100644",
      "index abcdefg..0000000",
      "--- a/src/old-file.ts",
      "+++ /dev/null",
      "@@ -1,3 +0,0 @@",
      "-import express from 'express';",
      "-const router = express.Router();",
      "-export default router;",
    ].join("\n");

    const result = parseGitDiff(diff);

    expect(result.pr.hasDeletedFiles).toBe(true);
    expect(result.files[0].status).toBe("deleted");
    expect(result.files[0].additions).toBe(0);
    expect(result.files[0].deletions).toBe(3);
  });

  test("parseGitDiff_fileRename", () => {
    const diff = [
      "diff --git a/src/old-name.ts b/src/new-name.ts",
      "similarity index 95%",
      "rename from src/old-name.ts",
      "rename to src/new-name.ts",
      "index 1234567..abcdefg 100644",
      "--- a/src/old-name.ts",
      "+++ b/src/new-name.ts",
      "@@ -1,3 +1,3 @@",
      " import express from 'express';",
      "-const old = true;",
      "+const renamed = true;",
      " export default renamed;",
    ].join("\n");

    const result = parseGitDiff(diff);

    expect(result.files[0].status).toBe("renamed");
    expect(result.files[0].path).toBe("src/new-name.ts");
    expect(result.files[0].additions).toBe(1);
    expect(result.files[0].deletions).toBe(1);
  });

  test("parseGitDiff_multipleHunks", () => {
    const diff = [
      "diff --git a/src/routes/auth.ts b/src/routes/auth.ts",
      "index 1234567..abcdefg 100644",
      "--- a/src/routes/auth.ts",
      "+++ b/src/routes/auth.ts",
      "@@ -10,6 +10,8 @@ const router = Router();",
      " line1",
      "+added1",
      "+added2",
      " line2",
      "@@ -50,4 +52,5 @@ router.post('/login');",
      " line3",
      "+added3",
      " line4",
    ].join("\n");

    const result = parseGitDiff(diff);

    expect(result.files[0].hunks).toHaveLength(2);
    expect(result.files[0].hunks[0]).toEqual({
      oldStart: 10,
      oldCount: 6,
      newStart: 10,
      newCount: 8,
    });
    expect(result.files[0].hunks[1]).toEqual({
      oldStart: 50,
      oldCount: 4,
      newStart: 52,
      newCount: 5,
    });
    expect(result.files[0].additions).toBe(3);
  });

  test("parseGitDiff_multipleFiles", () => {
    const diff = [
      "diff --git a/src/a.ts b/src/a.ts",
      "index 1234567..abcdefg 100644",
      "--- a/src/a.ts",
      "+++ b/src/a.ts",
      "@@ -1,3 +1,4 @@",
      " line1",
      "+added",
      " line2",
      "diff --git a/src/b.ts b/src/b.ts",
      "new file mode 100644",
      "index 0000000..abcdefg",
      "--- /dev/null",
      "+++ b/src/b.ts",
      "@@ -0,0 +1,2 @@",
      "+new1",
      "+new2",
    ].join("\n");

    const result = parseGitDiff(diff);

    expect(result.pr.totalFiles).toBe(2);
    expect(result.pr.totalAdditions).toBe(3);
    expect(result.pr.hasNewFiles).toBe(true);
    expect(result.files[0].path).toBe("src/a.ts");
    expect(result.files[0].status).toBe("modified");
    expect(result.files[1].path).toBe("src/b.ts");
    expect(result.files[1].status).toBe("added");
  });

  test("parseGitDiff_hunkWithoutCount", () => {
    const diff = [
      "diff --git a/README.md b/README.md",
      "index 1234567..abcdefg 100644",
      "--- a/README.md",
      "+++ b/README.md",
      "@@ -1 +1 @@",
      "-old title",
      "+new title",
    ].join("\n");

    const result = parseGitDiff(diff);

    expect(result.files[0].hunks[0]).toEqual({
      oldStart: 1,
      oldCount: 1,
      newStart: 1,
      newCount: 1,
    });
  });

  test("parseGitDiff_domainMatchesDefaultEmpty", () => {
    const diff = [
      "diff --git a/javascript/src/routes/auth.ts b/javascript/src/routes/auth.ts",
      "index 1234567..abcdefg 100644",
      "--- a/javascript/src/routes/auth.ts",
      "+++ b/javascript/src/routes/auth.ts",
      "@@ -1,3 +1,4 @@",
      " line1",
      "+added",
      " line2",
    ].join("\n");

    const result = parseGitDiff(diff);

    expect(result.files[0].domainMatches).toEqual([]);
  });
});
