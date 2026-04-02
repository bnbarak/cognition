export { parseGitDiff } from "./parser";
export { classifyFile } from "./classifier";
export { enrichWithDomainMap } from "./matcher";
export { generateDiff } from "./git-diff";
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
} from "./types";
