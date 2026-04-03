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

let diff4Result: Record<string, unknown>;
let diff6Result: Record<string, unknown>;

beforeAll(() => {
  const raw4 = runCli(
    `${path.join(FIXTURES, "diff4.txt")} --domain-map ${DOMAIN_MAP}`
  );
  diff4Result = JSON.parse(raw4);

  const raw6 = runCli(
    `${path.join(FIXTURES, "diff6.txt")} --domain-map ${DOMAIN_MAP}`
  );
  diff6Result = JSON.parse(raw6);
});

test("cliDomainMap_includesActionPlanInOutput", () => {
  expect(diff4Result).toHaveProperty("actionPlan");
});

test("cliDomainMap_hasAffectedSpecsArray", () => {
  const plan = diff4Result.actionPlan as Record<string, unknown>;

  expect(Array.isArray(plan.affectedSpecs)).toBe(true);
});

test("cliDomainMap_hasUnmappedFilesArray", () => {
  const plan = diff4Result.actionPlan as Record<string, unknown>;

  expect(Array.isArray(plan.unmappedFiles)).toBe(true);
});

test("cliDomainMap_hasNewControllerBoolean", () => {
  const plan = diff4Result.actionPlan as Record<string, unknown>;

  expect(typeof plan.hasNewController).toBe("boolean");
});

test("cliDomainMap_affectedSpecsIncludeExpressOpenapi", () => {
  const plan = diff4Result.actionPlan as {
    affectedSpecs: Array<{ spec: string; generator: string; changedSources: string[] }>;
  };
  const expressSpec = plan.affectedSpecs.find((s) =>
    s.spec.includes("express-openapi")
  );

  expect(expressSpec).toBeDefined();
  expect(expressSpec!.generator).toBe("scripts/generate-openapi-specs.sh");
  expect(expressSpec!.changedSources.length).toBeGreaterThan(0);
});

test("cliDomainMap_excludesSpringbootWhenNoJavaChanged", () => {
  const plan = diff4Result.actionPlan as {
    affectedSpecs: Array<{ spec: string }>;
  };
  const springSpec = plan.affectedSpecs.find((s) =>
    s.spec.includes("springboot-openapi")
  );

  expect(springSpec).toBeUndefined();
});

test("cliDomainMap_noActionPlanWithoutFlag", () => {
  const raw = runCli(path.join(FIXTURES, "diff4.txt"));
  const result = JSON.parse(raw);

  expect(result.actionPlan).toBeUndefined();
});

test("cliDomainMap_exitsOnNonexistentDomainMap", () => {
  expect(() => {
    runCli(
      `${path.join(FIXTURES, "diff4.txt")} --domain-map /nonexistent/map.yaml`
    );
  }).toThrow();
});

test("cliDomainMap_prettyPrintsWithActionPlan", () => {
  const raw = runCli(
    `${path.join(FIXTURES, "diff4.txt")} --domain-map ${DOMAIN_MAP} --pretty`
  );

  expect(raw).toContain("\n");
  expect(raw).toContain("  ");
  const result = JSON.parse(raw);
  expect(result).toHaveProperty("actionPlan");
});

test("cliDomainMap_detectsNewControllerInDiff6", () => {
  const plan = diff6Result.actionPlan as { hasNewController: boolean };

  expect(plan.hasNewController).toBe(true);
});

test("cliDomainMap_listsNewControllerInUnmappedFiles", () => {
  const plan = diff6Result.actionPlan as {
    unmappedFiles: string[];
  };

  expect(plan.unmappedFiles.length).toBeGreaterThan(0);
});
