import { FileChange, FileStatus, HunkRange, DiffAnalysis, PRSummary } from "./types";
import { classifyFile } from "./classifier";

const DIFF_HEADER_RE = /^diff --git a\/(.+?) b\/(.+)$/;
const NEW_FILE_RE = /^new file mode \d+$/;
const DELETED_FILE_RE = /^deleted file mode \d+$/;
const RENAME_FROM_RE = /^rename from (.+)$/;
const RENAME_TO_RE = /^rename to (.+)$/;
const HUNK_RE = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

interface RawFileDiff {
  pathA: string;
  pathB: string;
  isNew: boolean;
  isDeleted: boolean;
  isRenamed: boolean;
  hunks: HunkRange[];
  additions: number;
  deletions: number;
}

function parseRawDiffs(diffText: string): RawFileDiff[] {
  const lines = diffText.split("\n");
  const files: RawFileDiff[] = [];
  let current: RawFileDiff | null = null;
  let inHunkBody = false;

  for (const line of lines) {
    const headerMatch = line.match(DIFF_HEADER_RE);
    if (headerMatch) {
      if (current) {
        files.push(current);
      }
      current = {
        pathA: headerMatch[1],
        pathB: headerMatch[2],
        isNew: false,
        isDeleted: false,
        isRenamed: false,
        hunks: [],
        additions: 0,
        deletions: 0,
      };
      inHunkBody = false;
      continue;
    }

    if (!current) continue;

    if (NEW_FILE_RE.test(line)) {
      current.isNew = true;
      continue;
    }

    if (DELETED_FILE_RE.test(line)) {
      current.isDeleted = true;
      continue;
    }

    if (RENAME_FROM_RE.test(line) || RENAME_TO_RE.test(line)) {
      current.isRenamed = true;
      continue;
    }

    const hunkMatch = line.match(HUNK_RE);
    if (hunkMatch) {
      current.hunks.push({
        oldStart: parseInt(hunkMatch[1], 10),
        oldCount: hunkMatch[2] !== undefined ? parseInt(hunkMatch[2], 10) : 1,
        newStart: parseInt(hunkMatch[3], 10),
        newCount: hunkMatch[4] !== undefined ? parseInt(hunkMatch[4], 10) : 1,
      });
      inHunkBody = true;
      continue;
    }

    if (inHunkBody) {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        current.additions++;
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        current.deletions++;
      }
    }
  }

  if (current) {
    files.push(current);
  }

  return files;
}

function resolveStatus(raw: RawFileDiff): FileStatus {
  if (raw.isNew) return "added";
  if (raw.isDeleted) return "deleted";
  if (raw.isRenamed) return "renamed";
  return "modified";
}

function resolvePath(raw: RawFileDiff): string {
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
