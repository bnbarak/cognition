export { parseGitDiff } from "./parser";
export { classifyFile } from "./classifier";
export { enrichWithDomainMap } from "./matcher";
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
