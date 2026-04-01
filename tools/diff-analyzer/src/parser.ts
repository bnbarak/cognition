import { FileChange, FileStatus, HunkRange, DiffAnalysis, PRSummary } from "./types";
import { classifyFile } from "./classifier";

const DIFF_HEADER_RE = /^diff --git a\/(.+?) b\/(.+)$/;
const NEW_FILE_RE = /^new file mode \d+$/;
const DELETED_FILE_RE = /^deleted file mode \d+$/;
const RENAME_FROM_RE = /^rename from (.+)$/;
const RENAME_TO_RE = /^rename to (.+)$/;
const HUNK_RE = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

export interface RawFileDiff {
  pathA: string;
  pathB: string;
  isNew: boolean;
  isDeleted: boolean;
  isRenamed: boolean;
  hunks: HunkRange[];
  additions: number;
  deletions: number;
}

export function parseHunkHeader(line: string): HunkRange | null {
  const match = line.match(HUNK_RE);
  if (!match) return null;
  return {
    oldStart: parseInt(match[1], 10),
    oldCount: match[2] !== undefined ? parseInt(match[2], 10) : 1,
    newStart: parseInt(match[3], 10),
    newCount: match[4] !== undefined ? parseInt(match[4], 10) : 1,
  };
}

export function classifyDiffLine(line: string): "addition" | "deletion" | "context" {
  if (line.startsWith("+") && !line.startsWith("+++")) return "addition";
  if (line.startsWith("-") && !line.startsWith("---")) return "deletion";
  return "context";
}

export function detectFileMode(line: string): "new" | "deleted" | "rename" | null {
  if (NEW_FILE_RE.test(line)) return "new";
  if (DELETED_FILE_RE.test(line)) return "deleted";
  if (RENAME_FROM_RE.test(line) || RENAME_TO_RE.test(line)) return "rename";
  return null;
}

export function parseDiffHeader(line: string): { pathA: string; pathB: string } | null {
  const match = line.match(DIFF_HEADER_RE);
  if (!match) return null;
  return { pathA: match[1], pathB: match[2] };
}

function createEmptyRawFileDiff(pathA: string, pathB: string): RawFileDiff {
  return {
    pathA,
    pathB,
    isNew: false,
    isDeleted: false,
    isRenamed: false,
    hunks: [],
    additions: 0,
    deletions: 0,
  };
}

export function parseFileDiffLines(lines: string[]): RawFileDiff | null {
  if (lines.length === 0) return null;

  const header = parseDiffHeader(lines[0]);
  if (!header) return null;

  const fileDiff = createEmptyRawFileDiff(header.pathA, header.pathB);
  let inHunkBody = false;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    const mode = detectFileMode(line);
    if (mode === "new") { fileDiff.isNew = true; continue; }
    if (mode === "deleted") { fileDiff.isDeleted = true; continue; }
    if (mode === "rename") { fileDiff.isRenamed = true; continue; }

    const hunk = parseHunkHeader(line);
    if (hunk) {
      fileDiff.hunks.push(hunk);
      inHunkBody = true;
      continue;
    }

    if (inHunkBody) {
      const lineType = classifyDiffLine(line);
      if (lineType === "addition") fileDiff.additions++;
      if (lineType === "deletion") fileDiff.deletions++;
    }
  }

  return fileDiff;
}

export function splitDiffIntoFileSections(diffText: string): string[][] {
  const lines = diffText.split("\n");
  const sections: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (parseDiffHeader(line) && current.length > 0) {
      sections.push(current);
      current = [];
    }
    current.push(line);
  }

  if (current.length > 0 && current.some((l) => parseDiffHeader(l))) {
    sections.push(current);
  }

  return sections;
}

function parseRawDiffs(diffText: string): RawFileDiff[] {
  const sections = splitDiffIntoFileSections(diffText);
  const files: RawFileDiff[] = [];

  for (const section of sections) {
    const fileDiff = parseFileDiffLines(section);
    if (fileDiff) files.push(fileDiff);
  }

  return files;
}

export function resolveStatus(raw: RawFileDiff): FileStatus {
  if (raw.isNew) return "added";
  if (raw.isDeleted) return "deleted";
  if (raw.isRenamed) return "renamed";
  return "modified";
}

export function resolvePath(raw: RawFileDiff): string {
  if (raw.isRenamed) return raw.pathB;
  if (raw.isNew) return raw.pathB;
  return raw.pathA;
}

export function parseGitDiff(diffText: string): DiffAnalysis {
  const rawFiles = parseRawDiffs(diffText);

  const files: FileChange[] = rawFiles.map((raw) => {
    const path = resolvePath(raw);
    const classification = classifyFile(path);
    return {
      path,
      status: resolveStatus(raw),
      classification,
      additions: raw.additions,
      deletions: raw.deletions,
      totalChanges: raw.additions + raw.deletions,
      hunks: raw.hunks,
      domainMatches: [],
    };
  });

  const pr: PRSummary = {
    totalFiles: files.length,
    totalAdditions: files.reduce((sum, f) => sum + f.additions, 0),
    totalDeletions: files.reduce((sum, f) => sum + f.deletions, 0),
    hasNewFiles: files.some((f) => f.status === "added"),
    hasDeletedFiles: files.some((f) => f.status === "deleted"),
    hasSpecChanges: files.some((f) => f.classification === "spec"),
    hasRouteChanges: files.some((f) => f.classification === "route"),
    hasTypeChanges: files.some((f) => f.classification === "type"),
  };

  return { pr, files };
}
