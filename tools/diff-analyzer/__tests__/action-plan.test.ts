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
  test("generateActionPlan_onlyExpressSpecWhenJsChanged", () => {
      const analysis = makeAnalysis([
        makeFile({ path: "javascript/src/routes/clients.ts", classification: "route" }),
      ]);

      const plan = generateActionPlan(analysis, DOMAIN_MAP);

      expect(plan.affectedSpecs).toHaveLength(1);
      expect(plan.affectedSpecs[0].spec).toBe("docs/docs/specs/express-openapi.json");
      expect(plan.affectedSpecs[0].changedSources).toEqual(["javascript/src/routes/clients.ts"]);
  });

  test("generateActionPlan_onlySpringSpecWhenJavaChanged", () => {
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

  test("generateActionPlan_bothSpecsWhenBothChanged", () => {
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

  test("generateActionPlan_emptySpecsWhenNoSourceChanged", () => {
      const analysis = makeAnalysis([
        makeFile({ path: "docs/docs/product.md", classification: "doc" }),
      ]);

      const plan = generateActionPlan(analysis, DOMAIN_MAP);

      expect(plan.affectedSpecs).toHaveLength(0);
  });

  test("generateActionPlan_multipleChangedSourcesSameSpec", () => {
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

  test("generateActionPlan_identifiesUnmappedFiles", () => {
      const analysis = makeAnalysis([
        makeFile({ path: "javascript/src/middleware/cors.ts", classification: "unknown" }),
      ]);

      const plan = generateActionPlan(analysis, DOMAIN_MAP);

      expect(plan.unmappedFiles).toContain("javascript/src/middleware/cors.ts");
  });

  test("generateActionPlan_filtersNoiseFiles", () => {
      const analysis = makeAnalysis([
        makeFile({ path: "tools/diff-analyzer/src/parser.ts", classification: "unknown" }),
        makeFile({ path: "package-lock.json", classification: "unknown" }),
        makeFile({ path: "javascript/src/routes/__tests__/auth.test.ts", classification: "unknown" }),
      ]);

      const plan = generateActionPlan(analysis, DOMAIN_MAP);

      expect(plan.unmappedFiles).toHaveLength(0);
  });

  test("generateActionPlan_detectsNewExpressController", () => {
      const analysis = makeAnalysis([
        makeFile({
          path: "javascript/src/routes/notifications.ts",
          status: "added",
          classification: "route",
        }),
      ]);

      const plan = generateActionPlan(analysis, DOMAIN_MAP);

      expect(plan.hasNewController).toBe(true);
      expect(plan.unmappedFiles).toContain("javascript/src/routes/notifications.ts");
  });

  test("generateActionPlan_detectsNewJavaController", () => {
      const analysis = makeAnalysis([
        makeFile({
          path: "java/src/main/java/com/insurecrm/email/controller/NotificationController.java",
          status: "added",
          classification: "route",
        }),
      ]);

      const plan = generateActionPlan(analysis, DOMAIN_MAP);

      expect(plan.hasNewController).toBe(true);
      expect(plan.unmappedFiles).toContain(
        "java/src/main/java/com/insurecrm/email/controller/NotificationController.java"
      );
  });

  test("generateActionPlan_noFlagForMappedControllers", () => {
      const analysis = makeAnalysis([
        makeFile({ path: "javascript/src/routes/auth.ts", classification: "route" }),
      ]);

      const plan = generateActionPlan(analysis, DOMAIN_MAP);

      expect(plan.hasNewController).toBe(false);
  });

  test("generateActionPlan_newControllerPlusAppChange", () => {
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

      expect(plan.affectedSpecs).toHaveLength(0);
      expect(plan.hasNewController).toBe(true);
      expect(plan.unmappedFiles).toContain("javascript/src/routes/notifications.ts");
      expect(plan.unmappedFiles).toContain("javascript/src/app.ts");
  });
});
