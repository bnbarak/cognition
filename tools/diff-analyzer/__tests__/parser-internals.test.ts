import {
  parseHunkHeader,
  classifyDiffLine,
  detectFileMode,
  parseDiffHeader,
  splitDiffIntoFileSections,
  parseFileDiffLines,
  resolveStatus,
  resolvePath,
  RawFileDiff,
} from "../src/parser";

describe("parseDiffHeader", () => {
  test("parseDiffHeader_standardModifiedFile", () => {
    const result = parseDiffHeader(
      "diff --git a/javascript/src/routes/auth.ts b/javascript/src/routes/auth.ts"
    );

    expect(result).toEqual({
      pathA: "javascript/src/routes/auth.ts",
      pathB: "javascript/src/routes/auth.ts",
    });
  });

  test("parseDiffHeader_renamedFile", () => {
    const result = parseDiffHeader(
      "diff --git a/src/old-name.ts b/src/new-name.ts"
    );

    expect(result).toEqual({
      pathA: "src/old-name.ts",
      pathB: "src/new-name.ts",
    });
  });

  test("parseDiffHeader_pathWithSpaces", () => {
    const result = parseDiffHeader(
      "diff --git a/docs/my file.md b/docs/my file.md"
    );

    expect(result).toEqual({
      pathA: "docs/my file.md",
      pathB: "docs/my file.md",
    });
  });

  test("parseDiffHeader_deeplyNestedPath", () => {
    const result = parseDiffHeader(
      "diff --git a/java/src/main/java/com/insurecrm/email/model/EmailRequest.java b/java/src/main/java/com/insurecrm/email/model/EmailRequest.java"
    );

    expect(result).toEqual({
      pathA: "java/src/main/java/com/insurecrm/email/model/EmailRequest.java",
      pathB: "java/src/main/java/com/insurecrm/email/model/EmailRequest.java",
    });
  });

  test("parseDiffHeader_nonDiffLine", () => {
    const result = parseDiffHeader("index 1234567..abcdefg 100644");

    expect(result).toBeNull();
  });

  test("parseDiffHeader_emptyString", () => {
    const result = parseDiffHeader("");

    expect(result).toBeNull();
  });

  test("parseDiffHeader_hunkLine", () => {
    const result = parseDiffHeader("@@ -10,6 +10,8 @@ const router = Router();");

    expect(result).toBeNull();
  });
});

describe("parseHunkHeader", () => {
  test("parseHunkHeader_standardHunk", () => {
    const result = parseHunkHeader("@@ -10,6 +10,8 @@ const router = Router();");

    expect(result).toEqual({
      oldStart: 10,
      oldCount: 6,
      newStart: 10,
      newCount: 8,
    });
  });

  test("parseHunkHeader_singleLineOldAndNew", () => {
    const result = parseHunkHeader("@@ -1 +1 @@");

    expect(result).toEqual({
      oldStart: 1,
      oldCount: 1,
      newStart: 1,
      newCount: 1,
    });
  });

  test("parseHunkHeader_newFileHunk", () => {
    const result = parseHunkHeader("@@ -0,0 +1,150 @@");

    expect(result).toEqual({
      oldStart: 0,
      oldCount: 0,
      newStart: 1,
      newCount: 150,
    });
  });

  test("parseHunkHeader_deletedFileHunk", () => {
    const result = parseHunkHeader("@@ -1,3 +0,0 @@");

    expect(result).toEqual({
      oldStart: 1,
      oldCount: 3,
      newStart: 0,
      newCount: 0,
    });
  });

  test("parseHunkHeader_largeLineNumbers", () => {
    const result = parseHunkHeader("@@ -498,6 +501,59 @@ some context");

    expect(result).toEqual({
      oldStart: 498,
      oldCount: 6,
      newStart: 501,
      newCount: 59,
    });
  });

  test("parseHunkHeader_singleLineOldMultiNew", () => {
    const result = parseHunkHeader("@@ -5 +5,3 @@");

    expect(result).toEqual({
      oldStart: 5,
      oldCount: 1,
      newStart: 5,
      newCount: 3,
    });
  });

  test("parseHunkHeader_nonHunkLine", () => {
    const result = parseHunkHeader("+added line");

    expect(result).toBeNull();
  });

  test("parseHunkHeader_emptyString", () => {
    const result = parseHunkHeader("");

    expect(result).toBeNull();
  });

  test("parseHunkHeader_indexLine", () => {
    const result = parseHunkHeader("index 1234567..abcdefg 100644");

    expect(result).toBeNull();
  });
});

describe("classifyDiffLine", () => {
  test("classifyDiffLine_addedLine", () => {
    const result = classifyDiffLine("+const HOST = '0.0.0.0';");

    expect(result).toBe("addition");
  });

  test("classifyDiffLine_removedLine", () => {
    const result = classifyDiffLine("-const old = true;");

    expect(result).toBe("deletion");
  });

  test("classifyDiffLine_contextLine", () => {
    const result = classifyDiffLine(" const PORT = 3000;");

    expect(result).toBe("context");
  });

  test("classifyDiffLine_plusPlusPlus", () => {
    const result = classifyDiffLine("+++ b/src/app.ts");

    expect(result).toBe("context");
  });

  test("classifyDiffLine_minusMinusMinus", () => {
    const result = classifyDiffLine("--- a/src/app.ts");

    expect(result).toBe("context");
  });

  test("classifyDiffLine_emptyAddition", () => {
    const result = classifyDiffLine("+");

    expect(result).toBe("addition");
  });

  test("classifyDiffLine_emptyDeletion", () => {
    const result = classifyDiffLine("-");

    expect(result).toBe("deletion");
  });

  test("classifyDiffLine_emptyString", () => {
    const result = classifyDiffLine("");

    expect(result).toBe("context");
  });

  test("classifyDiffLine_blankContextLine", () => {
    const result = classifyDiffLine(" ");

    expect(result).toBe("context");
  });
});

describe("detectFileMode", () => {
  test("detectFileMode_newFile", () => {
    const result = detectFileMode("new file mode 100644");

    expect(result).toBe("new");
  });

  test("detectFileMode_newFileExecutable", () => {
    const result = detectFileMode("new file mode 100755");

    expect(result).toBe("new");
  });

  test("detectFileMode_deletedFile", () => {
    const result = detectFileMode("deleted file mode 100644");

    expect(result).toBe("deleted");
  });

  test("detectFileMode_renameFrom", () => {
    const result = detectFileMode("rename from src/old-name.ts");

    expect(result).toBe("rename");
  });

  test("detectFileMode_renameTo", () => {
    const result = detectFileMode("rename to src/new-name.ts");

    expect(result).toBe("rename");
  });

  test("detectFileMode_indexLine", () => {
    const result = detectFileMode("index 1234567..abcdefg 100644");

    expect(result).toBeNull();
  });

  test("detectFileMode_hunkHeader", () => {
    const result = detectFileMode("@@ -10,6 +10,8 @@");

    expect(result).toBeNull();
  });

  test("detectFileMode_addedLine", () => {
    const result = detectFileMode("+new line of code");

    expect(result).toBeNull();
  });

  test("detectFileMode_emptyString", () => {
    const result = detectFileMode("");

    expect(result).toBeNull();
  });
});

describe("splitDiffIntoFileSections", () => {
  test("splitDiffIntoFileSections_emptyDiff", () => {
    const result = splitDiffIntoFileSections("");

    expect(result).toEqual([]);
  });

  test("splitDiffIntoFileSections_singleFile", () => {
    const diff = [
      "diff --git a/src/a.ts b/src/a.ts",
      "index 1234567..abcdefg 100644",
      "@@ -1,3 +1,4 @@",
      "+added",
    ].join("\n");

    const result = splitDiffIntoFileSections(diff);

    expect(result).toHaveLength(1);
    expect(result[0][0]).toBe("diff --git a/src/a.ts b/src/a.ts");
    expect(result[0]).toHaveLength(4);
  });

  test("splitDiffIntoFileSections_twoFiles", () => {
    const diff = [
      "diff --git a/src/a.ts b/src/a.ts",
      "@@ -1,3 +1,4 @@",
      "+added",
      "diff --git a/src/b.ts b/src/b.ts",
      "@@ -1,2 +1,3 @@",
      "+new",
    ].join("\n");

    const result = splitDiffIntoFileSections(diff);

    expect(result).toHaveLength(2);
    expect(result[0][0]).toBe("diff --git a/src/a.ts b/src/a.ts");
    expect(result[0]).toHaveLength(3);
    expect(result[1][0]).toBe("diff --git a/src/b.ts b/src/b.ts");
    expect(result[1]).toHaveLength(3);
  });

  test("splitDiffIntoFileSections_threeFiles", () => {
    const diff = [
      "diff --git a/a.ts b/a.ts",
      "+line1",
      "diff --git a/b.ts b/b.ts",
      "+line2",
      "diff --git a/c.ts b/c.ts",
      "+line3",
    ].join("\n");

    const result = splitDiffIntoFileSections(diff);

    expect(result).toHaveLength(3);
  });

  test("splitDiffIntoFileSections_nonDiffContent", () => {
    const result = splitDiffIntoFileSections("just some random text\nno diff here");

    expect(result).toEqual([]);
  });
});

describe("parseFileDiffLines", () => {
  test("parseFileDiffLines_emptyArray", () => {
    const result = parseFileDiffLines([]);

    expect(result).toBeNull();
  });

  test("parseFileDiffLines_nonDiffFirstLine", () => {
    const result = parseFileDiffLines(["not a diff header", "+something"]);

    expect(result).toBeNull();
  });

  test("parseFileDiffLines_modifiedFile", () => {
    const lines = [
      "diff --git a/src/app.ts b/src/app.ts",
      "index 1234567..abcdefg 100644",
      "--- a/src/app.ts",
      "+++ b/src/app.ts",
      "@@ -10,4 +10,6 @@",
      " existing",
      "+added1",
      "+added2",
      " existing",
    ];

    const result = parseFileDiffLines(lines);

    expect(result).not.toBeNull();
    expect(result!.pathA).toBe("src/app.ts");
    expect(result!.pathB).toBe("src/app.ts");
    expect(result!.isNew).toBe(false);
    expect(result!.isDeleted).toBe(false);
    expect(result!.isRenamed).toBe(false);
    expect(result!.additions).toBe(2);
    expect(result!.deletions).toBe(0);
    expect(result!.hunks).toHaveLength(1);
  });

  test("parseFileDiffLines_newFile", () => {
    const lines = [
      "diff --git a/src/new.ts b/src/new.ts",
      "new file mode 100644",
      "index 0000000..abcdefg",
      "--- /dev/null",
      "+++ b/src/new.ts",
      "@@ -0,0 +1,3 @@",
      "+line1",
      "+line2",
      "+line3",
    ];

    const result = parseFileDiffLines(lines);

    expect(result).not.toBeNull();
    expect(result!.isNew).toBe(true);
    expect(result!.additions).toBe(3);
    expect(result!.hunks[0].oldStart).toBe(0);
    expect(result!.hunks[0].oldCount).toBe(0);
  });

  test("parseFileDiffLines_deletedFile", () => {
    const lines = [
      "diff --git a/src/old.ts b/src/old.ts",
      "deleted file mode 100644",
      "index abcdefg..0000000",
      "--- a/src/old.ts",
      "+++ /dev/null",
      "@@ -1,2 +0,0 @@",
      "-line1",
      "-line2",
    ];

    const result = parseFileDiffLines(lines);

    expect(result).not.toBeNull();
    expect(result!.isDeleted).toBe(true);
    expect(result!.deletions).toBe(2);
    expect(result!.additions).toBe(0);
  });

  test("parseFileDiffLines_renamedFile", () => {
    const lines = [
      "diff --git a/src/old.ts b/src/new.ts",
      "similarity index 95%",
      "rename from src/old.ts",
      "rename to src/new.ts",
      "index 1234567..abcdefg 100644",
      "--- a/src/old.ts",
      "+++ b/src/new.ts",
      "@@ -1,3 +1,3 @@",
      " unchanged",
      "-old",
      "+new",
    ];

    const result = parseFileDiffLines(lines);

    expect(result).not.toBeNull();
    expect(result!.isRenamed).toBe(true);
    expect(result!.pathA).toBe("src/old.ts");
    expect(result!.pathB).toBe("src/new.ts");
    expect(result!.additions).toBe(1);
    expect(result!.deletions).toBe(1);
  });

  test("parseFileDiffLines_multipleHunks", () => {
    const lines = [
      "diff --git a/src/file.ts b/src/file.ts",
      "--- a/src/file.ts",
      "+++ b/src/file.ts",
      "@@ -10,4 +10,5 @@",
      " ctx",
      "+add1",
      "@@ -50,3 +51,4 @@",
      " ctx",
      "+add2",
      "@@ -100,2 +102,3 @@",
      "+add3",
    ];

    const result = parseFileDiffLines(lines);

    expect(result).not.toBeNull();
    expect(result!.hunks).toHaveLength(3);
    expect(result!.additions).toBe(3);
    expect(result!.hunks[0].oldStart).toBe(10);
    expect(result!.hunks[1].oldStart).toBe(50);
    expect(result!.hunks[2].oldStart).toBe(100);
  });

  test("parseFileDiffLines_mixedAdditionsAndDeletions", () => {
    const lines = [
      "diff --git a/src/file.ts b/src/file.ts",
      "@@ -1,5 +1,5 @@",
      " line1",
      "-old2",
      "-old3",
      "+new2",
      "+new3",
      "+new4",
      " line5",
    ];

    const result = parseFileDiffLines(lines);

    expect(result).not.toBeNull();
    expect(result!.additions).toBe(3);
    expect(result!.deletions).toBe(2);
  });
});

describe("resolveStatus", () => {
  test("resolveStatus_newFile", () => {
    const raw: RawFileDiff = {
      pathA: "src/new.ts", pathB: "src/new.ts",
      isNew: true, isDeleted: false, isRenamed: false,
      hunks: [], additions: 0, deletions: 0,
    };

    const result = resolveStatus(raw);

    expect(result).toBe("added");
  });

  test("resolveStatus_deletedFile", () => {
    const raw: RawFileDiff = {
      pathA: "src/old.ts", pathB: "src/old.ts",
      isNew: false, isDeleted: true, isRenamed: false,
      hunks: [], additions: 0, deletions: 0,
    };

    const result = resolveStatus(raw);

    expect(result).toBe("deleted");
  });

  test("resolveStatus_renamedFile", () => {
    const raw: RawFileDiff = {
      pathA: "src/old.ts", pathB: "src/new.ts",
      isNew: false, isDeleted: false, isRenamed: true,
      hunks: [], additions: 0, deletions: 0,
    };

    const result = resolveStatus(raw);

    expect(result).toBe("renamed");
  });

  test("resolveStatus_modifiedFile", () => {
    const raw: RawFileDiff = {
      pathA: "src/app.ts", pathB: "src/app.ts",
      isNew: false, isDeleted: false, isRenamed: false,
      hunks: [], additions: 5, deletions: 2,
    };

    const result = resolveStatus(raw);

    expect(result).toBe("modified");
  });

  test("resolveStatus_newTakesPrecedenceOverRenamed", () => {
    const raw: RawFileDiff = {
      pathA: "a.ts", pathB: "b.ts",
      isNew: true, isDeleted: false, isRenamed: true,
      hunks: [], additions: 0, deletions: 0,
    };

    const result = resolveStatus(raw);

    expect(result).toBe("added");
  });
});

describe("resolvePath", () => {
  test("resolvePath_modifiedFile", () => {
    const raw: RawFileDiff = {
      pathA: "src/app.ts", pathB: "src/app.ts",
      isNew: false, isDeleted: false, isRenamed: false,
      hunks: [], additions: 0, deletions: 0,
    };

    const result = resolvePath(raw);

    expect(result).toBe("src/app.ts");
  });

  test("resolvePath_newFile", () => {
    const raw: RawFileDiff = {
      pathA: "src/new.ts", pathB: "src/new.ts",
      isNew: true, isDeleted: false, isRenamed: false,
      hunks: [], additions: 0, deletions: 0,
    };

    const result = resolvePath(raw);

    expect(result).toBe("src/new.ts");
  });

  test("resolvePath_renamedFile", () => {
    const raw: RawFileDiff = {
      pathA: "src/old-name.ts", pathB: "src/new-name.ts",
      isNew: false, isDeleted: false, isRenamed: true,
      hunks: [], additions: 0, deletions: 0,
    };

    const result = resolvePath(raw);

    expect(result).toBe("src/new-name.ts");
  });

  test("resolvePath_deletedFile", () => {
    const raw: RawFileDiff = {
      pathA: "src/deleted.ts", pathB: "src/deleted.ts",
      isNew: false, isDeleted: true, isRenamed: false,
      hunks: [], additions: 0, deletions: 0,
    };

    const result = resolvePath(raw);

    expect(result).toBe("src/deleted.ts");
  });
});
