/** Top-level analysis result for a PR diff */
export interface DiffAnalysis {
  pr: PRSummary;
  files: FileChange[];
  actionPlan?: ActionPlan;
}

/** Deterministic action plan derived from domain-map + diff analysis */
export interface ActionPlan {
  /** Which specs need regeneration based on changed files */
  affectedSpecs: AffectedSpec[];
  /** Pre-grouped concern groups with doc pages and paths */
  concernGroups: ConcernGroup[];
  /** Files that don't map to any domain-map entry */
  unmappedFiles: string[];
  /** Whether any concern group involves a new (unmapped) controller */
  hasNewController: boolean;
}

/** A spec that needs regeneration */
export interface AffectedSpec {
  spec: string;
  generator: string;
  /** Source files in this spec that were changed in the diff */
  changedSources: string[];
}

/** A pre-computed concern group for the agent */
export interface ConcernGroup {
  /** Name of the concern group (derived from doc page or controller name) */
  name: string;
  /** Which update path to use: "A" (annotations→specs→OAD), "B" (narrative markdown), or "both" */
  path: "A" | "B" | "both";
  /** Doc pages that need updating */
  docs: string[];
  /** Source files in this group that were changed */
  changedFiles: string[];
  /** Specs that need regeneration for this group */
  specs: string[];
}

/** PR-level summary metrics */
export interface PRSummary {
  totalFiles: number;
  totalAdditions: number;
  totalDeletions: number;
  hasNewFiles: boolean;
  hasDeletedFiles: boolean;
  hasSpecChanges: boolean;
  hasRouteChanges: boolean;
  hasTypeChanges: boolean;
}

/** Per-file change information */
export interface FileChange {
  path: string;
  status: FileStatus;
  classification: FileClassification;
  additions: number;
  deletions: number;
  totalChanges: number;
  hunks: HunkRange[];
  domainMatches: DomainMatch[];
}

export type FileStatus = "modified" | "added" | "deleted" | "renamed";

export type FileClassification =
  | "route"
  | "type"
  | "spec"
  | "config"
  | "doc"
  | "unknown";

/** A single hunk range from the diff */
export interface HunkRange {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
}

/** A match from the domain map for a changed file */
export interface DomainMatch {
  doc: string;
  section: string | null;
  concern: string;
  linesOverlap: boolean | null;
}

/** Shape of a page entry in domain-map.yaml */
export interface DomainMapPage {
  doc: string;
  section?: string;
  sources: DomainMapSource[];
}

/** Shape of a spec entry in domain-map.yaml */
export interface DomainMapSpec {
  spec: string;
  generator?: string;
  sources: DomainMapSource[];
}

/** A source file entry in the domain map */
export interface DomainMapSource {
  file: string;
  lines?: [number, number];
  concern: string;
}

/** Full domain map YAML structure */
export interface DomainMap {
  pages: DomainMapPage[];
  specs: DomainMapSpec[];
  mkdocs_config?: string;
}
