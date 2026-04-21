import { describe, test, expect } from "vitest";
import type { Claim, ClaimStatus } from "../../../javascript/src/types/claim";
import {
  advanceClaim,
  canTransitionClaim,
  VALID_TRANSITIONS,
} from "../../../javascript/src/lib/claim-transitions";

/**
 * ====================================================================
 * Scenario: HARD 1 — refactor to make the code testable.
 *
 * Originally the state-machine lived inside the Express handler for
 * `PATCH /api/claims/:n/status` — tangled with req/res, `new Date()`,
 * and `Date.now()`. We extracted it into a pure `advanceClaim()` +
 * `canTransitionClaim()` (see ./claim-transitions.ts) so every
 * transition, reason-note, and approved-amount path can be exercised
 * without booting Express.
 * ====================================================================
 */

const FIXED_TS = "2024-06-15T10:00:00.000Z";

function makeClaim(overrides: Partial<Claim> = {}): Claim {
  return {
    claimNumber: "CLM-2024-ABCDEF01",
    policyNumber: "SF-2024-00123",
    clientId: "cli_001",
    category: "auto_collision",
    status: "submitted",
    filedAt: "2024-06-01T08:00:00.000Z",
    incidentDate: "2024-05-30",
    description: "Rear-ended at red light",
    estimatedAmount: 3500,
    approvedAmount: null,
    incidentLocation: { address: "1 Main St", city: "Hartford", state: "CT", zip: "06103" },
    contactPhone: "+1-860-555-0100",
    contactEmail: "claimant@example.com",
    assignedAdjuster: null,
    documents: [],
    notes: [],
    updatedAt: "2024-06-01T08:00:00.000Z",
    ...overrides,
  };
}


describe("VALID_TRANSITIONS", () => {
  test("VALID_TRANSITIONS_closedIsTerminal", () => {
    const terminal = VALID_TRANSITIONS.closed;


    expect(terminal).toEqual([]);
  });

  test("VALID_TRANSITIONS_coversEveryStatus", () => {
    const allStatuses: ClaimStatus[] = [
      "submitted",
      "under_review",
      "approved",
      "denied",
      "settled",
      "closed",
    ];


    const keys = Object.keys(VALID_TRANSITIONS).sort();


    expect(keys).toEqual([...allStatuses].sort());
  });
});


describe("canTransitionClaim", () => {
  test("canTransitionClaim_submittedToUnderReview", () => {
    const ok = canTransitionClaim("submitted", "under_review");


    expect(ok).toBe(true);
  });

  test("canTransitionClaim_submittedToApprovedDirectly", () => {
    const ok = canTransitionClaim("submitted", "approved");


    expect(ok).toBe(false);
  });

  test("canTransitionClaim_underReviewToApproved", () => {
    const ok = canTransitionClaim("under_review", "approved");


    expect(ok).toBe(true);
  });

  test("canTransitionClaim_approvedToSettled", () => {
    const ok = canTransitionClaim("approved", "settled");


    expect(ok).toBe(true);
  });

  test("canTransitionClaim_deniedBackToUnderReview", () => {
    const ok = canTransitionClaim("denied", "under_review");


    expect(ok).toBe(false);
  });

  test("canTransitionClaim_closedIsTerminal", () => {
    const ok = canTransitionClaim("closed", "submitted");


    expect(ok).toBe(false);
  });
});


describe("advanceClaim — happy paths", () => {
  test("advanceClaim_submittedToUnderReview_setsStatusAndUpdatedAt", () => {
    const claim = makeClaim({ status: "submitted" });


    const result = advanceClaim(claim, "under_review", { isoTimestamp: FIXED_TS });


    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.claim.status).toBe("under_review");
      expect(result.claim.updatedAt).toBe(FIXED_TS);
    }
  });

  test("advanceClaim_doesNotMutateInputClaim", () => {
    const claim = makeClaim({ status: "submitted" });
    const snapshot = JSON.parse(JSON.stringify(claim));


    advanceClaim(claim, "under_review", { isoTimestamp: FIXED_TS });


    expect(claim).toEqual(snapshot);
  });

  test("advanceClaim_underReviewToApproved_withApprovedAmount", () => {
    const claim = makeClaim({ status: "under_review" });


    const result = advanceClaim(claim, "approved", {
      isoTimestamp: FIXED_TS,
      approvedAmount: 2800,
    });


    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.claim.status).toBe("approved");
      expect(result.claim.approvedAmount).toBe(2800);
    }
  });

  test("advanceClaim_approvedAmountIgnoredForNonApprovedTransitions", () => {
    const claim = makeClaim({ status: "submitted" });


    const result = advanceClaim(claim, "denied", {
      isoTimestamp: FIXED_TS,
      approvedAmount: 9999,
    });


    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.claim.status).toBe("denied");
      expect(result.claim.approvedAmount).toBeNull();
    }
  });
});


describe("advanceClaim — audit note side effect", () => {
  test("advanceClaim_withoutReason_doesNotAppendNote", () => {
    const claim = makeClaim({ status: "submitted" });


    const result = advanceClaim(claim, "under_review", { isoTimestamp: FIXED_TS });


    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.claim.notes).toHaveLength(0);
    }
  });

  test("advanceClaim_withReason_appendsInternalNoteWithInjectedId", () => {
    const claim = makeClaim({ status: "under_review" });


    const result = advanceClaim(claim, "denied", {
      isoTimestamp: FIXED_TS,
      reason: "Policy exclusion applies",
      noteIdGenerator: () => "note-fixed-1",
    });


    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.claim.notes).toHaveLength(1);
      expect(result.claim.notes[0]).toEqual({
        noteId: "note-fixed-1",
        author: "system",
        content: "Status changed to denied: Policy exclusion applies",
        createdAt: FIXED_TS,
        internal: true,
      });
    }
  });
});


describe("advanceClaim — invalid transitions", () => {
  test("advanceClaim_submittedToApproved_rejected", () => {
    const claim = makeClaim({ status: "submitted" });


    const result = advanceClaim(claim, "approved", { isoTimestamp: FIXED_TS });


    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("invalid_transition");
      expect(result.message).toBe("Cannot transition from 'submitted' to 'approved'");
    }
  });

  test("advanceClaim_closedToAnything_rejected", () => {
    const claim = makeClaim({ status: "closed" });


    const result = advanceClaim(claim, "submitted", { isoTimestamp: FIXED_TS });


    expect(result.ok).toBe(false);
  });

  test("advanceClaim_settledBackwardsToApproved_rejected", () => {
    const claim = makeClaim({ status: "settled" });


    const result = advanceClaim(claim, "approved", { isoTimestamp: FIXED_TS });


    expect(result.ok).toBe(false);
  });
});
