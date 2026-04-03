import {
  ActionPlan,
  AffectedSpec,
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
 * Finds files that don't map to any domain-map entry (pages or specs).
 */
function computeUnmappedFiles(
  files: FileChange[],
  domainMap: DomainMap
): string[] {
  const mappedFiles = new Set<string>();

  for (const page of domainMap.pages) {
    for (const source of page.sources) {
      mappedFiles.add(source.file);
    }
  }
  for (const spec of domainMap.specs) {
    for (const source of spec.sources) {
      mappedFiles.add(source.file);
    }
  }

  return files
    .filter((f) => !mappedFiles.has(f.path))
    .map((f) => f.path);
}

/**
 * Generates a deterministic action plan from diff analysis + domain map.
 * Provides pre-computed spec regeneration hints and unmapped file lists.
 * The agent still decides how to group concerns and which update path to use.
 */
export function generateActionPlan(
  analysis: DiffAnalysis,
  domainMap: DomainMap
): ActionPlan {
  const meaningfulFiles = analysis.files.filter((f) => !isNoise(f.path));
  const affectedSpecs = computeAffectedSpecs(meaningfulFiles, domainMap);
  const unmappedFiles = computeUnmappedFiles(meaningfulFiles, domainMap);

  const hasNewController = unmappedFiles.some(
    (f) =>
      (f.startsWith("javascript/src/routes/") && f.endsWith(".ts")) ||
      (f.includes("/controller/") && f.endsWith(".java"))
  );

  return {
    affectedSpecs,
    unmappedFiles,
    hasNewController,
  };
}
