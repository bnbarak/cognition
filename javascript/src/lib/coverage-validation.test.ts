import { describe, test, expect } from "vitest";
import type { CoverageLine, GenerateCOIRequest } from "../types/coi";
import {
  validateCoverageLimits,
  validateWaiverReferences,
  buildDescriptionOfOperations,
} from "./coverage-validation";

/**
 * ====================================================================
 * Scenario: EASY — pure unit tests for existing pure functions.
 *
 * validateCoverageLimits / validateWaiverReferences /
 * buildDescriptionOfOperations are already pure: they take data in,
 * return data out, touch nothing external. No refactor needed — the
 * only code change was exporting them from their own module so the
 * test file could import them.
 * ====================================================================
 */

function glLine(overrides: Partial<CoverageLine["limits"]> = {}): CoverageLine {
  return {
    type: "general_liability",
    policyNumber: "GL-1",
    carrier: "Acme Mutual",
    effectiveDate: "2024-01-01",
    expirationDate: "2025-01-01",
    limits: { eachOccurrence: 1_000_000, generalAggregate: 2_000_000, ...overrides },
  };
}

function autoLine(overrides: Partial<CoverageLine["limits"]> = {}): CoverageLine {
  return {
    type: "auto_liability",
    policyNumber: "AL-1",
    carrier: "Acme Mutual",
    effectiveDate: "2024-01-01",
    expirationDate: "2025-01-01",
    limits: { eachOccurrence: 0, combinedSingleLimit: 500_000, ...overrides },
  };
}

function wcLine(overrides: Partial<CoverageLine["limits"]> = {}): CoverageLine {
  return {
    type: "workers_comp",
    policyNumber: "WC-1",
    carrier: "Acme Mutual",
    effectiveDate: "2024-01-01",
    expirationDate: "2025-01-01",
    limits: { eachOccurrence: 0, perAccident: 500_000, ...overrides },
  };
}

function umbrellaLine(overrides: Partial<CoverageLine["limits"]> = {}): CoverageLine {
  return {
    type: "umbrella",
    policyNumber: "UM-1",
    carrier: "Acme Mutual",
    effectiveDate: "2024-01-01",
    expirationDate: "2025-01-01",
    limits: { eachOccurrence: 5_000_000, ...overrides },
  };
}

function proLine(overrides: Partial<CoverageLine["limits"]> = {}): CoverageLine {
  return {
    type: "professional_liability",
    policyNumber: "PL-1",
    carrier: "Acme Mutual",
    effectiveDate: "2024-01-01",
    expirationDate: "2025-01-01",
    limits: { eachOccurrence: 1_000_000, ...overrides },
  };
}


describe("validateCoverageLimits — general_liability", () => {
  test("validateCoverageLimits_generalLiability_meetingMinimum", () => {
    const line = glLine({ eachOccurrence: 100_000, generalAggregate: 200_000 });


    const result = validateCoverageLimits(line);


    expect(result).toBeNull();
  });

  test("validateCoverageLimits_generalLiability_eachOccurrenceBelowMinimum", () => {
    const line = glLine({ eachOccurrence: 99_999, generalAggregate: 200_000 });


    const result = validateCoverageLimits(line);


    expect(result).toContain("each-occurrence limit must be at least $100,000");
    expect(result).toContain("99999");
  });

  test("validateCoverageLimits_generalLiability_missingEachOccurrence", () => {
    const line = glLine();
    line.limits.eachOccurrence = 0;


    const result = validateCoverageLimits(line);


    expect(result).toContain("each-occurrence limit must be at least $100,000");
  });

  test("validateCoverageLimits_generalLiability_aggregateBelowEachOccurrence", () => {
    const line = glLine({ eachOccurrence: 1_000_000, generalAggregate: 500_000 });


    const result = validateCoverageLimits(line);


    expect(result).toBe("General liability aggregate must be >= each-occurrence limit");
  });

  test("validateCoverageLimits_generalLiability_missingAggregate", () => {
    const line = glLine({ eachOccurrence: 1_000_000, generalAggregate: undefined });


    const result = validateCoverageLimits(line);


    expect(result).toBe("General liability aggregate must be >= each-occurrence limit");
  });
});


describe("validateCoverageLimits — auto_liability", () => {
  test("validateCoverageLimits_autoLiability_meetingMinimum", () => {
    const line = autoLine({ combinedSingleLimit: 50_000 });


    const result = validateCoverageLimits(line);


    expect(result).toBeNull();
  });

  test("validateCoverageLimits_autoLiability_belowMinimum", () => {
    const line = autoLine({ combinedSingleLimit: 49_999 });


    const result = validateCoverageLimits(line);


    expect(result).toBe("Auto liability combined single limit must be at least $50,000");
  });

  test("validateCoverageLimits_autoLiability_missingCombinedSingleLimit", () => {
    const line = autoLine({ combinedSingleLimit: undefined });


    const result = validateCoverageLimits(line);


    expect(result).toBe("Auto liability combined single limit must be at least $50,000");
  });
});


describe("validateCoverageLimits — workers_comp", () => {
  test("validateCoverageLimits_workersComp_meetingMinimum", () => {
    const line = wcLine({ perAccident: 100_000 });


    const result = validateCoverageLimits(line);


    expect(result).toBeNull();
  });

  test("validateCoverageLimits_workersComp_belowMinimum", () => {
    const line = wcLine({ perAccident: 50_000 });


    const result = validateCoverageLimits(line);


    expect(result).toBe("Workers comp per-accident limit must be at least $100,000");
  });
});


describe("validateCoverageLimits — umbrella", () => {
  test("validateCoverageLimits_umbrella_meetingMinimum", () => {
    const line = umbrellaLine({ eachOccurrence: 1_000_000 });


    const result = validateCoverageLimits(line);


    expect(result).toBeNull();
  });

  test("validateCoverageLimits_umbrella_belowMinimum", () => {
    const line = umbrellaLine({ eachOccurrence: 999_999 });


    const result = validateCoverageLimits(line);


    expect(result).toBe("Umbrella each-occurrence limit must be at least $1,000,000");
  });
});


describe("validateCoverageLimits — professional_liability", () => {
  test("validateCoverageLimits_professionalLiability_meetingMinimum", () => {
    const line = proLine({ eachOccurrence: 250_000 });


    const result = validateCoverageLimits(line);


    expect(result).toBeNull();
  });

  test("validateCoverageLimits_professionalLiability_belowMinimum", () => {
    const line = proLine({ eachOccurrence: 100_000 });


    const result = validateCoverageLimits(line);


    expect(result).toBe("Professional liability each-occurrence limit must be at least $250,000");
  });
});


describe("validateWaiverReferences", () => {
  const baseRequest: GenerateCOIRequest = {
    clientId: "cli_001",
    insuredName: "Acme Corp",
    insuredAddress: { street: "1", city: "x", state: "CT", zip: "06103" },
    coverageLines: [glLine(), autoLine()],
    certificateHolder: { name: "h", address: { street: "1", city: "x", state: "CT", zip: "06103" } },
  };

  test("validateWaiverReferences_noWaiver", () => {
    const request = { ...baseRequest, waiverOfSubrogation: undefined };


    const result = validateWaiverReferences(request);


    expect(result).toBeNull();
  });

  test("validateWaiverReferences_allTypesCovered", () => {
    const request = {
      ...baseRequest,
      waiverOfSubrogation: {
        appliesTo: ["general_liability" as const, "auto_liability" as const],
        description: "waiver",
      },
    };


    const result = validateWaiverReferences(request);


    expect(result).toBeNull();
  });

  test("validateWaiverReferences_referencesUncoveredType", () => {
    const request = {
      ...baseRequest,
      waiverOfSubrogation: {
        appliesTo: ["workers_comp" as const],
        description: "waiver",
      },
    };


    const result = validateWaiverReferences(request);


    expect(result).toContain("workers_comp");
    expect(result).toContain("not included in the certificate");
  });
});


describe("buildDescriptionOfOperations", () => {
  const baseRequest: GenerateCOIRequest = {
    clientId: "cli_001",
    insuredName: "Acme Corp",
    insuredAddress: { street: "1", city: "x", state: "CT", zip: "06103" },
    coverageLines: [glLine()],
    certificateHolder: { name: "h", address: { street: "1", city: "x", state: "CT", zip: "06103" } },
  };

  test("buildDescriptionOfOperations_onlyCoverageTypes", () => {
    const request = { ...baseRequest, coverageLines: [glLine(), autoLine()] };


    const result = buildDescriptionOfOperations(request, request.coverageLines);


    expect(result).toBe("Coverage types: general liability, auto liability.");
  });

  test("buildDescriptionOfOperations_withUserDescription", () => {
    const request = { ...baseRequest, descriptionOfOperations: "Downtown office location." };


    const result = buildDescriptionOfOperations(request, request.coverageLines);


    expect(result.startsWith("Downtown office location.")).toBe(true);
    expect(result).toContain("Coverage types: general liability.");
  });

  test("buildDescriptionOfOperations_withAdditionalInsureds", () => {
    const request: GenerateCOIRequest = {
      ...baseRequest,
      additionalInsureds: [
        { name: "Landlord LLC", address: baseRequest.insuredAddress, relationship: "landlord" },
        { name: "General Contractor Inc", address: baseRequest.insuredAddress, relationship: "contractor" },
      ],
    };


    const result = buildDescriptionOfOperations(request, request.coverageLines);


    expect(result).toContain("Additional insured: Landlord LLC, General Contractor Inc.");
  });

  test("buildDescriptionOfOperations_withWaiverOfSubrogation", () => {
    const request: GenerateCOIRequest = {
      ...baseRequest,
      waiverOfSubrogation: {
        appliesTo: ["general_liability", "auto_liability"],
        description: "Blanket waiver.",
      },
    };


    const result = buildDescriptionOfOperations(request, request.coverageLines);


    expect(result).toContain("Waiver of subrogation applies to: general liability, auto liability.");
  });
});
