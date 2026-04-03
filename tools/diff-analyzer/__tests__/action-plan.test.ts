import { generateActionPlan } from "../src/action-plan";
import { DiffAnalysis, DomainMap, FileChange } from "../src/types";

function makeFile(overrides: Partial<FileChange>): FileChange {
  return {
    path: overrides.path ?? "unknown.ts",
    status: overrides.status ?? "modified",
    classification: overrides.classification ?? "unknown",
    additions: overrides.additions ?? 10,
    deletions: overrides.deletions ?? 5,
    totalChanges: overrides.totalChanges ?? 15,
    hunks: overrides.hunks ?? [],
    domainMatches: overrides.domainMatches ?? [],
  };
}

function makeAnalysis(files: FileChange[]): DiffAnalysis {
  return {
    pr: {
      totalFiles: files.length,
      totalAdditions: files.reduce((s, f) => s + f.additions, 0),
      totalDeletions: files.reduce((s, f) => s + f.deletions, 0),
      hasNewFiles: files.some((f) => f.status === "added"),
      hasDeletedFiles: files.some((f) => f.status === "deleted"),
      hasSpecChanges: files.some((f) => f.classification === "spec"),
      hasRouteChanges: files.some((f) => f.classification === "route"),
      hasTypeChanges: files.some((f) => f.classification === "type"),
    },
    files,
  };
}

const DOMAIN_MAP: DomainMap = {
  pages: [
    {
      doc: "docs/docs/index.md",
      section: "System at a Glance",
      sources: [
        { file: "javascript/src/routes/auth.ts", concern: "Auth controller entry" },
        { file: "javascript/src/routes/clients.ts", concern: "Clients controller entry" },
      ],
    },
    {
      doc: "docs/docs/product.md",
      section: "Architecture",
      sources: [
        { file: "javascript/src/routes/auth.ts", concern: "Auth row in architecture table" },
        { file: "javascript/src/routes/clients.ts", concern: "Clients row in architecture table" },
      ],
    },
    {
      doc: "docs/docs/api/core-api.md",
      section: "API Reference (OAD-rendered)",
      sources: [
        { file: "javascript/src/routes/auth.ts", concern: "Auth endpoints" },
        { file: "javascript/src/routes/clients.ts", concern: "Client endpoints" },
        { file: "javascript/src/types/client.ts", concern: "Client types" },
      ],
    },
    {
      doc: "docs/docs/api/email-api.md",
      section: "API Reference (OAD-rendered)",
      sources: [
        { file: "java/src/main/java/com/insurecrm/email/controller/SendEmailController.java", concern: "Send Email endpoints" },
      ],
    },
  ],
  specs: [
    {
      spec: "docs/docs/specs/express-openapi.json",
      generator: "scripts/generate-openapi-specs.sh",
      sources: [
        { file: "javascript/src/routes/auth.ts", concern: "Auth endpoints" },
        { file: "javascript/src/routes/clients.ts", concern: "Client endpoints" },
        { file: "javascript/src/types/client.ts", concern: "Client types" },
      ],
    },
    {
      spec: "docs/docs/specs/springboot-openapi.json",
      generator: "scripts/generate-openapi-specs.sh",
      sources: [
        { file: "java/src/main/java/com/insurecrm/email/controller/SendEmailController.java", concern: "Send Email endpoints" },
      ],
    },
  ],
};

describe("generateActionPlan", () => {
  describe("affectedSpecs", () => {
    it("returns only Express spec when only JS files changed", () => {
      const analysis = makeAnalysis([
        makeFile({ path: "javascript/src/routes/clients.ts", classification: "route" }),
      ]);

      const plan = generateActionPlan(analysis, DOMAIN_MAP);

      expect(plan.affectedSpecs).toHaveLength(1);
      expect(plan.affectedSpecs[0].spec).toBe("docs/docs/specs/express-openapi.json");
      expect(plan.affectedSpecs[0].changedSources).toEqual(["javascript/src/routes/clients.ts"]);
    });

    it("returns only Spring Boot spec when only Java files changed", () => {
      const analysis = makeAnalysis([
        makeFile({
          path: "java/src/main/java/com/insurecrm/email/controller/SendEmailController.java",
          classification: "route",
        }),
      ]);

      const plan = generateActionPlan(analysis, DOMAIN_MAP);

      expect(plan.affectedSpecs).toHaveLength(1);
      expect(plan.affectedSpecs[0].spec).toBe("docs/docs/specs/springboot-openapi.json");
    });

    it("returns both specs when JS and Java files changed", () => {
      const analysis = makeAnalysis([
        makeFile({ path: "javascript/src/routes/auth.ts", classification: "route" }),
        makeFile({
          path: "java/src/main/java/com/insurecrm/email/controller/SendEmailController.java",
          classification: "route",
        }),
      ]);

      const plan = generateActionPlan(analysis, DOMAIN_MAP);

      expect(plan.affectedSpecs).toHaveLength(2);
      const specNames = plan.affectedSpecs.map((s) => s.spec).sort();
      expect(specNames).toEqual([
        "docs/docs/specs/express-openapi.json",
        "docs/docs/specs/springboot-openapi.json",
      ]);
    });

    it("returns empty when no spec source files changed", () => {
      const analysis = makeAnalysis([
        makeFile({ path: "docs/docs/product.md", classification: "doc" }),
      ]);

      const plan = generateActionPlan(analysis, DOMAIN_MAP);

      expect(plan.affectedSpecs).toHaveLength(0);
    });

    it("lists multiple changed sources for the same spec", () => {
      const analysis = makeAnalysis([
        makeFile({ path: "javascript/src/routes/auth.ts", classification: "route" }),
        makeFile({ path: "javascript/src/types/client.ts", classification: "type" }),
      ]);

      const plan = generateActionPlan(analysis, DOMAIN_MAP);

      expect(plan.affectedSpecs).toHaveLength(1);
      expect(plan.affectedSpecs[0].changedSources.sort()).toEqual([
        "javascript/src/routes/auth.ts",
        "javascript/src/types/client.ts",
      ]);
    });
  });

  describe("concernGroups", () => {
    it("merges doc pages that share changed files into one group", () => {
      const analysis = makeAnalysis([
        makeFile({ path: "javascript/src/routes/auth.ts", classification: "route" }),
      ]);

      const plan = generateActionPlan(analysis, DOMAIN_MAP);

      // auth.ts maps to index.md, product.md, and core-api.md — should merge
      expect(plan.concernGroups.length).toBeGreaterThanOrEqual(1);
      const group = plan.concernGroups[0];
      expect(group.docs).toContain("docs/docs/index.md");
      expect(group.docs).toContain("docs/docs/product.md");
      expect(group.docs).toContain("docs/docs/api/core-api.md");
    });

    it("assigns path 'A' for API-only changes", () => {
      const analysis = makeAnalysis([
        makeFile({ path: "javascript/src/types/client.ts", classification: "type" }),
      ]);

      const plan = generateActionPlan(analysis, DOMAIN_MAP);

      const group = plan.concernGroups.find((g) => g.changedFiles.includes("javascript/src/types/client.ts"));
      expect(group).toBeDefined();
      expect(group!.path).toBe("A");
    });

    it("assigns path 'both' when routes affect narrative and API docs", () => {
      const analysis = makeAnalysis([
        makeFile({ path: "javascript/src/routes/auth.ts", classification: "route" }),
      ]);

      const plan = generateActionPlan(analysis, DOMAIN_MAP);

      const group = plan.concernGroups.find((g) => g.changedFiles.includes("javascript/src/routes/auth.ts"));
      expect(group).toBeDefined();
      // auth.ts maps to index.md (narrative) + core-api.md (API) → "both"
      expect(group!.path).toBe("both");
    });

    it("tags specs on concern groups correctly", () => {
      const analysis = makeAnalysis([
        makeFile({ path: "javascript/src/routes/clients.ts", classification: "route" }),
      ]);

      const plan = generateActionPlan(analysis, DOMAIN_MAP);

      const group = plan.concernGroups.find((g) => g.changedFiles.includes("javascript/src/routes/clients.ts"));
      expect(group).toBeDefined();
      expect(group!.specs).toContain("docs/docs/specs/express-openapi.json");
      expect(group!.specs).not.toContain("docs/docs/specs/springboot-openapi.json");
    });
  });

  describe("unmapped files", () => {
    it("identifies unmapped non-route files", () => {
      const analysis = makeAnalysis([
        makeFile({ path: "javascript/src/middleware/cors.ts", classification: "unknown" }),
      ]);

      const plan = generateActionPlan(analysis, DOMAIN_MAP);

      expect(plan.unmappedFiles).toContain("javascript/src/middleware/cors.ts");
    });

    it("filters out noise files", () => {
      const analysis = makeAnalysis([
        makeFile({ path: "tools/diff-analyzer/src/parser.ts", classification: "unknown" }),
        makeFile({ path: "package-lock.json", classification: "unknown" }),
        makeFile({ path: "javascript/src/routes/__tests__/auth.test.ts", classification: "unknown" }),
      ]);

      const plan = generateActionPlan(analysis, DOMAIN_MAP);

      expect(plan.unmappedFiles).toHaveLength(0);
      expect(plan.concernGroups).toHaveLength(0);
    });
  });

  describe("new controller detection", () => {
    it("detects new unmapped Express controller", () => {
      const analysis = makeAnalysis([
        makeFile({
          path: "javascript/src/routes/notifications.ts",
          status: "added",
          classification: "route",
        }),
      ]);

      const plan = generateActionPlan(analysis, DOMAIN_MAP);

      expect(plan.hasNewController).toBe(true);
      // Should create a concern group for the new controller
      const group = plan.concernGroups.find((g) =>
        g.changedFiles.includes("javascript/src/routes/notifications.ts")
      );
      expect(group).toBeDefined();
      expect(group!.name).toBe("notifications");
      expect(group!.path).toBe("both");
      expect(group!.specs).toContain("docs/docs/specs/express-openapi.json");
    });

    it("detects new unmapped Java controller", () => {
      const analysis = makeAnalysis([
        makeFile({
          path: "java/src/main/java/com/insurecrm/email/controller/NotificationController.java",
          status: "added",
          classification: "route",
        }),
      ]);

      const plan = generateActionPlan(analysis, DOMAIN_MAP);

      expect(plan.hasNewController).toBe(true);
      const group = plan.concernGroups.find((g) =>
        g.changedFiles.includes("java/src/main/java/com/insurecrm/email/controller/NotificationController.java")
      );
      expect(group).toBeDefined();
      expect(group!.specs).toContain("docs/docs/specs/springboot-openapi.json");
    });

    it("does not flag mapped controllers as new", () => {
      const analysis = makeAnalysis([
        makeFile({ path: "javascript/src/routes/auth.ts", classification: "route" }),
      ]);

      const plan = generateActionPlan(analysis, DOMAIN_MAP);

      expect(plan.hasNewController).toBe(false);
    });
  });

  describe("real-world scenario: PR #21 (notifications controller)", () => {
    it("produces correct plan for a new Express controller + app.ts change", () => {
      const analysis = makeAnalysis([
        makeFile({
          path: "javascript/src/routes/notifications.ts",
          status: "added",
          classification: "route",
          additions: 148,
          deletions: 0,
        }),
        makeFile({
          path: "javascript/src/app.ts",
          status: "modified",
          classification: "config",
          additions: 3,
          deletions: 0,
        }),
      ]);

      const plan = generateActionPlan(analysis, DOMAIN_MAP);

      // Only Express spec should be affected — NOT Spring Boot
      expect(plan.affectedSpecs).toHaveLength(0);
      // notifications.ts is unmapped → new controller detected
      expect(plan.hasNewController).toBe(true);

      // There should be a group for the new controller
      const newGroup = plan.concernGroups.find((g) => g.name === "notifications");
      expect(newGroup).toBeDefined();
      expect(newGroup!.specs).toContain("docs/docs/specs/express-openapi.json");
      expect(newGroup!.specs).not.toContain("docs/docs/specs/springboot-openapi.json");
    });
  });
});
