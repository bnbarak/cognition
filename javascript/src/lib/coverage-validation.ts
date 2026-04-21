/**
 * Pure validation helpers for Certificates of Insurance.
 *
 * These functions are extracted out of the Express handler so they can be
 * exercised directly in unit tests without spinning up an HTTP server.
 */
import type { CoverageLine, GenerateCOIRequest } from "../types/coi";

/** Minimum coverage limits required per coverage type (USD). */
export const COVERAGE_MINIMUMS = {
  general_liability: {
    eachOccurrence: 100_000,
  },
  auto_liability: {
    combinedSingleLimit: 50_000,
  },
  workers_comp: {
    perAccident: 100_000,
  },
  umbrella: {
    eachOccurrence: 1_000_000,
  },
  professional_liability: {
    eachOccurrence: 250_000,
  },
} as const;

/**
 * Validate that a coverage line meets the minimum limits for its type.
 *
 * Returns `null` when the line is valid, or a human-readable error string
 * describing the first violation found.
 */
export function validateCoverageLimits(line: CoverageLine): string | null {
  const { limits } = line;

  switch (line.type) {
    case "general_liability":
      if (!limits.eachOccurrence || limits.eachOccurrence < COVERAGE_MINIMUMS.general_liability.eachOccurrence) {
        return `General liability each-occurrence limit must be at least $100,000 (got ${limits.eachOccurrence})`;
      }
      if (!limits.generalAggregate || limits.generalAggregate < limits.eachOccurrence) {
        return `General liability aggregate must be >= each-occurrence limit`;
      }
      return null;

    case "auto_liability":
      if (!limits.combinedSingleLimit || limits.combinedSingleLimit < COVERAGE_MINIMUMS.auto_liability.combinedSingleLimit) {
        return `Auto liability combined single limit must be at least $50,000`;
      }
      return null;

    case "workers_comp":
      if (!limits.perAccident || limits.perAccident < COVERAGE_MINIMUMS.workers_comp.perAccident) {
        return `Workers comp per-accident limit must be at least $100,000`;
      }
      return null;

    case "umbrella":
      if (!limits.eachOccurrence || limits.eachOccurrence < COVERAGE_MINIMUMS.umbrella.eachOccurrence) {
        return `Umbrella each-occurrence limit must be at least $1,000,000`;
      }
      return null;

    case "professional_liability":
      if (!limits.eachOccurrence || limits.eachOccurrence < COVERAGE_MINIMUMS.professional_liability.eachOccurrence) {
        return `Professional liability each-occurrence limit must be at least $250,000`;
      }
      return null;
  }
}

/**
 * Ensure every coverage type referenced by a waiver of subrogation appears
 * on the certificate's coverage lines.
 *
 * Returns `null` when the waiver references only covered types, or an error
 * naming the first missing type.
 */
export function validateWaiverReferences(request: GenerateCOIRequest): string | null {
  if (!request.waiverOfSubrogation) return null;

  const coveredTypes = new Set(request.coverageLines.map((l) => l.type));
  for (const waiverType of request.waiverOfSubrogation.appliesTo) {
    if (!coveredTypes.has(waiverType)) {
      return `Waiver of subrogation references coverage type '${waiverType}' which is not included in the certificate`;
    }
  }
  return null;
}

/**
 * Build the "Description of Operations" string for a COI, combining any
 * user-supplied description with an auto-generated coverage summary,
 * additional insured names, and waiver details.
 */
export function buildDescriptionOfOperations(
  request: GenerateCOIRequest,
  coverageLines: CoverageLine[]
): string {
  const parts: string[] = [];

  if (request.descriptionOfOperations) {
    parts.push(request.descriptionOfOperations);
  }

  const coverageTypes = coverageLines.map((l) => l.type.replace(/_/g, " ")).join(", ");
  parts.push(`Coverage types: ${coverageTypes}.`);

  if (request.additionalInsureds && request.additionalInsureds.length > 0) {
    const names = request.additionalInsureds.map((ai) => ai.name).join(", ");
    parts.push(`Additional insured: ${names}.`);
  }

  if (request.waiverOfSubrogation) {
    const waiverTypes = request.waiverOfSubrogation.appliesTo
      .map((t) => t.replace(/_/g, " "))
      .join(", ");
    parts.push(`Waiver of subrogation applies to: ${waiverTypes}.`);
  }

  return parts.join(" ");
}
