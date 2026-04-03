export { parseGitDiff } from "./parser";
export { classifyFile } from "./classifier";
export { enrichWithDomainMap } from "./matcher";
export { generateDiff } from "./git-diff";
export { generateActionPlan } from "./action-plan";
export type { GitDiffOptions } from "./git-diff";
export type {
  DiffAnalysis,
  PRSummary,
  FileChange,
  FileStatus,
  FileClassification,
  HunkRange,
  DomainMatch,
  DomainMap,
  DomainMapPage,
  DomainMapSpec,
  DomainMapSource,
  ActionPlan,
  AffectedSpec,
  ConcernGroup,
} from "./types";
