import * as fs from "fs";
import * as path from "path";
import { parseGitDiff } from "../src/parser";
import { DiffAnalysis } from "../src/types";

const fixturesDir = path.join(__dirname, "fixtures");

function readFixture(name: string): string {
  return fs.readFileSync(path.join(fixturesDir, name), "utf-8");
}

describe("diff4 — interface changes", () => {
  let result: DiffAnalysis;

  beforeAll(() => {
    result = parseGitDiff(readFixture("diff4.txt"));
  });

  test("parseGitDiff_diff4_fileCount", () => {
    expect(result.pr.totalFiles).toBe(3);
  });

  test("parseGitDiff_diff4_totalAdditions", () => {
    expect(result.pr.totalAdditions).toBe(17);
  });

  test("parseGitDiff_diff4_totalDeletions", () => {
    expect(result.pr.totalDeletions).toBe(22);
  });

  test("parseGitDiff_diff4_noNewFiles", () => {
    expect(result.pr.hasNewFiles).toBe(false);
  });

  test("parseGitDiff_diff4_noDeletedFiles", () => {
    expect(result.pr.hasDeletedFiles).toBe(false);
  });

  test("parseGitDiff_diff4_hasRouteChanges", () => {
    expect(result.pr.hasRouteChanges).toBe(true);
  });

  test("parseGitDiff_diff4_hasTypeChanges", () => {
    expect(result.pr.hasTypeChanges).toBe(true);
  });

  test("parseGitDiff_diff4_emailRequestClassification", () => {
    const file = result.files.find((f) =>
      f.path.includes("EmailRequest.java")
    );

    expect(file).toBeDefined();
    expect(file!.classification).toBe("type");
    expect(file!.status).toBe("modified");
    expect(file!.additions).toBe(12);
    expect(file!.deletions).toBe(0);
  });

  test("parseGitDiff_diff4_emailResponseClassification", () => {
    const file = result.files.find((f) =>
      f.path.includes("EmailResponse.java")
    );

    expect(file).toBeDefined();
    expect(file!.classification).toBe("type");
    expect(file!.additions).toBe(5);
    expect(file!.deletions).toBe(0);
    expect(file!.hunks).toHaveLength(3);
  });

  test("parseGitDiff_diff4_clientsRouteDeletedEndpoint", () => {
    const file = result.files.find((f) => f.path.includes("clients.ts"));

    expect(file).toBeDefined();
    expect(file!.classification).toBe("route");
    expect(file!.additions).toBe(0);
    expect(file!.deletions).toBe(22);
    expect(file!.hunks).toHaveLength(1);
    expect(file!.hunks[0].oldStart).toBe(240);
  });

  test("parseGitDiff_diff4_emailRequestHunks", () => {
    const file = result.files.find((f) =>
      f.path.includes("EmailRequest.java")
    );

    expect(file!.hunks).toHaveLength(2);
    expect(file!.hunks[0]).toEqual({
      oldStart: 35,
      oldCount: 6,
      newStart: 35,
      newCount: 12,
    });
    expect(file!.hunks[1]).toEqual({
      oldStart: 63,
      oldCount: 4,
      newStart: 69,
      newCount: 10,
    });
  });
});

describe("diff5 — core logic + spec changes", () => {
  let result: DiffAnalysis;

  beforeAll(() => {
    result = parseGitDiff(readFixture("diff5.txt"));
  });

  test("parseGitDiff_diff5_fileCount", () => {
    expect(result.pr.totalFiles).toBe(3);
  });

  test("parseGitDiff_diff5_totalAdditions", () => {
    expect(result.pr.totalAdditions).toBe(144);
  });

  test("parseGitDiff_diff5_totalDeletions", () => {
    expect(result.pr.totalDeletions).toBe(0);
  });

  test("parseGitDiff_diff5_hasSpecChanges", () => {
    expect(result.pr.hasSpecChanges).toBe(true);
  });

  test("parseGitDiff_diff5_hasRouteChanges", () => {
    expect(result.pr.hasRouteChanges).toBe(true);
  });

  test("parseGitDiff_diff5_noTypeChanges", () => {
    expect(result.pr.hasTypeChanges).toBe(false);
  });

  test("parseGitDiff_diff5_authRouteChanges", () => {
    const file = result.files.find((f) => f.path.includes("auth.ts"));

    expect(file).toBeDefined();
    expect(file!.classification).toBe("route");
    expect(file!.status).toBe("modified");
    expect(file!.additions).toBe(25);
    expect(file!.deletions).toBe(0);
    expect(file!.hunks).toHaveLength(4);
  });

  test("parseGitDiff_diff5_clientsRouteChanges", () => {
    const file = result.files.find((f) => f.path.includes("clients.ts"));

    expect(file).toBeDefined();
    expect(file!.classification).toBe("route");
    expect(file!.additions).toBe(63);
    expect(file!.hunks).toHaveLength(1);
    expect(file!.hunks[0].oldStart).toBe(262);
  });

  test("parseGitDiff_diff5_specFileChanges", () => {
    const file = result.files.find((f) =>
      f.path.includes("express-openapi.json")
    );

    expect(file).toBeDefined();
    expect(file!.classification).toBe("spec");
    expect(file!.additions).toBe(56);
    expect(file!.hunks).toHaveLength(2);
  });
});

describe("diff6 — new COI controller", () => {
  let result: DiffAnalysis;

  beforeAll(() => {
    result = parseGitDiff(readFixture("diff6.txt"));
  });

  test("parseGitDiff_diff6_fileCount", () => {
    expect(result.pr.totalFiles).toBe(3);
  });

  test("parseGitDiff_diff6_totalAdditions", () => {
    expect(result.pr.totalAdditions).toBe(613);
  });

  test("parseGitDiff_diff6_totalDeletions", () => {
    expect(result.pr.totalDeletions).toBe(0);
  });

  test("parseGitDiff_diff6_hasNewFiles", () => {
    expect(result.pr.hasNewFiles).toBe(true);
  });

  test("parseGitDiff_diff6_hasRouteChanges", () => {
    expect(result.pr.hasRouteChanges).toBe(true);
  });

  test("parseGitDiff_diff6_hasTypeChanges", () => {
    expect(result.pr.hasTypeChanges).toBe(true);
  });

  test("parseGitDiff_diff6_appConfigModified", () => {
    const file = result.files.find((f) => f.path === "javascript/src/app.ts");

    expect(file).toBeDefined();
    expect(file!.classification).toBe("config");
    expect(file!.status).toBe("modified");
    expect(file!.additions).toBe(3);
    expect(file!.hunks).toHaveLength(3);
  });

  test("parseGitDiff_diff6_coiRouteAdded", () => {
    const file = result.files.find((f) =>
      f.path === "javascript/src/routes/coi.ts"
    );

    expect(file).toBeDefined();
    expect(file!.classification).toBe("route");
    expect(file!.status).toBe("added");
    expect(file!.additions).toBe(460);
    expect(file!.hunks).toHaveLength(1);
    expect(file!.hunks[0]).toEqual({
      oldStart: 0,
      oldCount: 0,
      newStart: 1,
      newCount: 460,
    });
  });

  test("parseGitDiff_diff6_coiTypeAdded", () => {
    const file = result.files.find((f) =>
      f.path === "javascript/src/types/coi.ts"
    );

    expect(file).toBeDefined();
    expect(file!.classification).toBe("type");
    expect(file!.status).toBe("added");
    expect(file!.additions).toBe(150);
    expect(file!.hunks).toHaveLength(1);
  });

  test("parseGitDiff_diff6_noDeletedFiles", () => {
    expect(result.pr.hasDeletedFiles).toBe(false);
  });

  test("parseGitDiff_diff6_noSpecChanges", () => {
    expect(result.pr.hasSpecChanges).toBe(false);
  });
});
