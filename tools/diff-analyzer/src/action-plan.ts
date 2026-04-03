import {
  ActionPlan,
  AffectedSpec,
  ConcernGroup,
  DiffAnalysis,
  DomainMap,
  FileChange,
} from "./types";

/** Files that never affect documentation — skip during planning */
const NOISE_PATTERNS: RegExp[] = [
  /__tests__\//,
  /\.test\.(ts|js|java)$/,
  /\.spec\.(ts|js|java)$/,
  /package-lock\.json$/,
  /\.lock$/,
  /\.github\//,
  /\.gitlab-ci\.yml$/,
  /\.gitignore$/,
  /tools\/diff-analyzer\//,
];

function isNoise(path: string): boolean {
  return NOISE_PATTERNS.some((re) => re.test(path));
}

/**
 * Determines which specs need regeneration based on changed files.
 * A spec needs regen if ANY of its source files were changed in the diff.
 */
function computeAffectedSpecs(
  files: FileChange[],
  domainMap: DomainMap
): AffectedSpec[] {
  const changedPaths = new Set(files.map((f) => f.path));
  const affected: AffectedSpec[] = [];

  for (const spec of domainMap.specs) {
    const changedSources = spec.sources
      .map((s) => s.file)
      .filter((f) => changedPaths.has(f));

    if (changedSources.length > 0) {
      affected.push({
        spec: spec.spec,
        generator: spec.generator ?? "scripts/generate-openapi-specs.sh",
        changedSources,
      });
    }
  }

  return affected;
}

/**
 * Determines the update path for a concern group.
 * - "A" if the group only has API-affecting files (routes, types → annotations → specs)
 * - "B" if the group only has narrative doc changes
 * - "both" if it has a mix
 */
function determinePath(
  changedFiles: string[],
  docs: string[]
): "A" | "B" | "both" {
  const hasApiFiles = changedFiles.some(
    (f) =>
      f.startsWith("javascript/src/routes/") ||
      f.startsWith("javascript/src/types/") ||
      f.includes("/controller/") ||
      f.includes("/model/")
  );

  const hasNarrativeDocs = docs.some(
    (d) =>
      d.includes("index.md") ||
      d.includes("product.md") ||
      d.includes("authentication.md")
  );

  const hasApiDocs = docs.some(
    (d) => d.includes("api/core-api.md") || d.includes("api/email-api.md")
  );

  if (hasApiFiles && hasNarrativeDocs) return "both";
  if (hasApiFiles || hasApiDocs) return "A";
  return "B";
}

/**
 * Derives a human-readable group name from a doc path.
 */
function groupNameFromDoc(doc: string): string {
  if (doc.includes("index.md")) return "index";
  if (doc.includes("product.md")) return "product";
  if (doc.includes("authentication.md")) return "authentication";
  if (doc.includes("core-api.md")) return "core-api";
  if (doc.includes("email-api.md")) return "email-api";

  // Extract meaningful name from path
  const basename = doc.split("/").pop()?.replace(/\.md$/, "") ?? doc;
  return basename;
}

/**
 * Groups changed files into concern groups based on domain-map mappings.
 * Each concern group maps to a set of doc pages that need updating.
 */
function computeConcernGroups(
  files: FileChange[],
  domainMap: DomainMap
): { groups: ConcernGroup[]; unmapped: string[]; hasNewController: boolean } {
  const changedPaths = new Set(files.map((f) => f.path));
  const meaningfulFiles = files.filter((f) => !isNoise(f.path));

  // Map: doc path → set of changed source files
  const docToFiles = new Map<string, Set<string>>();
  // Map: doc path → set of spec paths
  const docToSpecs = new Map<string, Set<string>>();
  // Track which files got mapped
  const mappedFiles = new Set<string>();

  // Match files against pages
  for (const page of domainMap.pages) {
    for (const source of page.sources) {
      if (changedPaths.has(source.file)) {
        const key = page.doc;
        if (!docToFiles.has(key)) docToFiles.set(key, new Set());
        docToFiles.get(key)!.add(source.file);
        mappedFiles.add(source.file);
      }
    }
  }

  // Match files against specs to tag specs onto groups
  for (const spec of domainMap.specs) {
    for (const source of spec.sources) {
      if (changedPaths.has(source.file)) {
        // Find which doc pages this source also maps to
        for (const page of domainMap.pages) {
          for (const pageSource of page.sources) {
            if (pageSource.file === source.file) {
              const key = page.doc;
              if (!docToSpecs.has(key)) docToSpecs.set(key, new Set());
              docToSpecs.get(key)!.add(spec.spec);
            }
          }
        }
      }
    }
  }

  // Build concern groups — merge doc pages that share changed files
  // (e.g., index.md and product.md both affected by same controller → one group)
  const groups: ConcernGroup[] = [];
  const processedDocs = new Set<string>();

  for (const [doc, fileSet] of docToFiles) {
    if (processedDocs.has(doc)) continue;

    const allDocs = [doc];
    const allFiles = new Set(fileSet);
    const allSpecs = new Set(docToSpecs.get(doc) ?? []);
    processedDocs.add(doc);

    // Check if other doc pages share the same changed files — merge them
    for (const [otherDoc, otherFileSet] of docToFiles) {
      if (processedDocs.has(otherDoc)) continue;
      const hasOverlap = [...otherFileSet].some((f) => allFiles.has(f));
      if (hasOverlap) {
        allDocs.push(otherDoc);
        for (const f of otherFileSet) allFiles.add(f);
        const otherSpecs = docToSpecs.get(otherDoc);
        if (otherSpecs) {
          for (const s of otherSpecs) allSpecs.add(s);
        }
        processedDocs.add(otherDoc);
      }
    }

    const changedFilesList = [...allFiles].sort();
    const docsList = [...new Set(allDocs)].sort();
    const specsList = [...allSpecs].sort();

    groups.push({
      name: groupNameFromDoc(doc),
      path: determinePath(changedFilesList, docsList),
      docs: docsList,
      changedFiles: changedFilesList,
      specs: specsList,
    });
  }

  // Find unmapped files (excluding noise)
  const unmapped = meaningfulFiles
    .filter((f) => !mappedFiles.has(f.path))
    .map((f) => f.path);

  // Detect new controllers among unmapped files
  const hasNewController = unmapped.some(
    (f) =>
      (f.startsWith("javascript/src/routes/") && f.endsWith(".ts")) ||
      (f.includes("/controller/") && f.endsWith(".java"))
  );

  // If there are unmapped route/controller files, create a group for them
  const unmappedRoutes = unmapped.filter(
    (f) =>
      (f.startsWith("javascript/src/routes/") && f.endsWith(".ts")) ||
      (f.includes("/controller/") && f.endsWith(".java"))
  );

  if (unmappedRoutes.length > 0) {
    // Determine which specs they would affect based on file type
    const specs: string[] = [];
    if (unmappedRoutes.some((f) => f.startsWith("javascript/"))) {
      specs.push("docs/docs/specs/express-openapi.json");
    }
    if (unmappedRoutes.some((f) => f.startsWith("java/"))) {
      specs.push("docs/docs/specs/springboot-openapi.json");
    }

    const routeName = unmappedRoutes[0]
      .split("/")
      .pop()
      ?.replace(/\.(ts|java)$/, "") ?? "new-controller";

    groups.push({
      name: routeName,
      path: "both",
      docs: [],
      changedFiles: unmappedRoutes,
      specs,
    });
  }

  return { groups, unmapped, hasNewController };
}

/**
 * Generates a deterministic action plan from diff analysis + domain map.
 * This gives the agent concrete, pre-computed instructions instead of
 * requiring it to reason about which specs to regenerate and which docs to update.
 */
export function generateActionPlan(
  analysis: DiffAnalysis,
  domainMap: DomainMap
): ActionPlan {
  const meaningfulFiles = analysis.files.filter((f) => !isNoise(f.path));
  const affectedSpecs = computeAffectedSpecs(meaningfulFiles, domainMap);
  const { groups, unmapped, hasNewController } = computeConcernGroups(
    meaningfulFiles,
    domainMap
  );

  return {
    affectedSpecs,
    concernGroups: groups,
    unmappedFiles: unmapped.filter(
      (f) =>
        !(f.startsWith("javascript/src/routes/") && f.endsWith(".ts")) &&
        !(f.includes("/controller/") && f.endsWith(".java"))
    ),
    hasNewController,
  };
}
