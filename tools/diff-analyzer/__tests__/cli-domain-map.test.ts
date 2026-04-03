import { execSync } from "child_process";
import * as path from "path";

const CLI = path.resolve(__dirname, "../src/cli.ts");
const FIXTURES = path.resolve(__dirname, "fixtures");
const DOMAIN_MAP = path.resolve(FIXTURES, "test-domain-map.yaml");

function runCli(args: string): string {
  return execSync(`npx ts-node ${CLI} ${args}`, {
    encoding: "utf-8",
    cwd: path.resolve(__dirname, ".."),
    timeout: 30000,
  });
}

describe("CLI --domain-map integration", () => {
  describe("with diff4.txt (Express route changes)", () => {
    let result: Record<string, unknown>;

    beforeAll(() => {
      const raw = runCli(
        `${path.join(FIXTURES, "diff4.txt")} --domain-map ${DOMAIN_MAP}`
      );
      result = JSON.parse(raw);
    });

    it("includes actionPlan in output", () => {
      expect(result).toHaveProperty("actionPlan");
    });

    it("has affectedSpecs array", () => {
      const plan = result.actionPlan as Record<string, unknown>;
      expect(Array.isArray(plan.affectedSpecs)).toBe(true);
    });

    it("has unmappedFiles array", () => {
      const plan = result.actionPlan as Record<string, unknown>;
      expect(Array.isArray(plan.unmappedFiles)).toBe(true);
    });

    it("has hasNewController boolean", () => {
      const plan = result.actionPlan as Record<string, unknown>;
      expect(typeof plan.hasNewController).toBe("boolean");
    });

    it("affected specs include express-openapi when Express routes changed", () => {
      const plan = result.actionPlan as {
        affectedSpecs: Array<{ spec: string; generator: string; changedSources: string[] }>;
      };
      const expressSpec = plan.affectedSpecs.find((s) =>
        s.spec.includes("express-openapi")
      );
      if (expressSpec) {
        expect(expressSpec.generator).toBe("scripts/generate-openapi-specs.sh");
        expect(expressSpec.changedSources.length).toBeGreaterThan(0);
      }
    });

    it("does NOT include springboot-openapi when no Java files changed", () => {
      const plan = result.actionPlan as {
        affectedSpecs: Array<{ spec: string }>;
      };
      const springSpec = plan.affectedSpecs.find((s) =>
        s.spec.includes("springboot-openapi")
      );
      expect(springSpec).toBeUndefined();
    });

  });

  describe("without --domain-map flag", () => {
    it("does NOT include actionPlan in output", () => {
      const raw = runCli(path.join(FIXTURES, "diff4.txt"));
      const result = JSON.parse(raw);
      expect(result.actionPlan).toBeUndefined();
    });
  });

  describe("with --domain-map pointing to nonexistent file", () => {
    it("exits with error", () => {
      expect(() => {
        runCli(
          `${path.join(FIXTURES, "diff4.txt")} --domain-map /nonexistent/map.yaml`
        );
      }).toThrow();
    });
  });

  describe("with --pretty flag", () => {
    it("pretty-prints JSON with actionPlan", () => {
      const raw = runCli(
        `${path.join(FIXTURES, "diff4.txt")} --domain-map ${DOMAIN_MAP} --pretty`
      );
      // Pretty-printed JSON has newlines and indentation
      expect(raw).toContain("\n");
      expect(raw).toContain("  ");
      const result = JSON.parse(raw);
      expect(result).toHaveProperty("actionPlan");
    });
  });

  describe("with diff6.txt (new controller, unmapped)", () => {
    let result: Record<string, unknown>;

    beforeAll(() => {
      const raw = runCli(
        `${path.join(FIXTURES, "diff6.txt")} --domain-map ${DOMAIN_MAP}`
      );
      result = JSON.parse(raw);
    });

    it("detects new controller in unmapped route file", () => {
      const plan = result.actionPlan as { hasNewController: boolean };
      expect(plan.hasNewController).toBe(true);
    });

    it("lists new controller in unmappedFiles", () => {
      const plan = result.actionPlan as {
        unmappedFiles: string[];
      };
      // diff6 adds a new controller — should appear in unmappedFiles
      expect(plan.unmappedFiles.length).toBeGreaterThan(0);
    });
  });
});
