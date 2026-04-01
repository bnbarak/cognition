import { DomainMap, DomainMatch, FileChange, HunkRange } from "./types";

function hunksOverlapRange(hunks: HunkRange[], lines: [number, number]): boolean {
  const [mapStart, mapEnd] = lines;
  return hunks.some((hunk) => {
    const hunkEnd = hunk.newStart + hunk.newCount - 1;
    return hunk.newStart <= mapEnd && hunkEnd >= mapStart;
  });
}

export function enrichWithDomainMap(
  files: FileChange[],
  domainMap: DomainMap
): FileChange[] {
  return files.map((file) => {
    const matches: DomainMatch[] = [];

    for (const page of domainMap.pages) {
      for (const source of page.sources) {
        if (source.file !== file.path) continue;

        let linesOverlap: boolean | null = null;
        if (source.lines && file.hunks.length > 0) {
          linesOverlap = hunksOverlapRange(file.hunks, source.lines);
        }

        matches.push({
          doc: page.doc,
          section: page.section ?? null,
          concern: source.concern,
          linesOverlap,
        });
      }
    }

    for (const spec of domainMap.specs) {
      for (const source of spec.sources) {
        if (source.file !== file.path) continue;

        matches.push({
          doc: spec.spec,
          section: null,
          concern: source.concern,
          linesOverlap: null,
        });
      }
    }

    return { ...file, domainMatches: matches };
  });
}
