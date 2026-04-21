/**
 * Pure claim-state-transition logic, extracted from the Express handler so
 * it can be unit-tested without a running HTTP server.
 *
 * The original code interleaved:
 *   - request/response handling (Express)
 *   - state-machine logic (valid transitions)
 *   - clock-dependent mutations (updatedAt, note timestamps)
 *   - audit-note side effects
 *
 * Here we isolate the pure parts. The side effects that remain time-dependent
 * accept an `isoTimestamp` argument instead of calling `new Date()` directly,
 * so tests can pass a fixed timestamp.
 */
import type { Claim, ClaimStatus, ClaimNote } from "../types/claim";

/** Allowed `from -> [to...]` transitions for a claim's status. */
export const VALID_TRANSITIONS: Record<ClaimStatus, ClaimStatus[]> = {
  submitted: ["under_review", "denied"],
  under_review: ["approved", "denied"],
  approved: ["settled"],
  denied: ["closed"],
  settled: ["closed"],
  closed: [],
};

/** Options for advancing a claim. */
export interface AdvanceClaimOptions {
  /** ISO timestamp to stamp onto `updatedAt` and any audit note. */
  isoTimestamp: string;
  /** If the new status is `approved`, set the approved amount (USD). */
  approvedAmount?: number;
  /** Optional human-readable reason; recorded as an internal audit note. */
  reason?: string;
  /** ID generator for audit notes (injectable so tests are deterministic). */
  noteIdGenerator?: () => string;
}

/** Result of an attempted claim transition. */
export type AdvanceClaimResult =
  | { ok: true; claim: Claim }
  | { ok: false; reason: "invalid_transition"; message: string };

/** Is the transition from -> to allowed by the state machine? */
export function canTransitionClaim(from: ClaimStatus, to: ClaimStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Advance a claim through its state machine.
 *
 * Returns a result describing whether the transition was valid and (if so)
 * the new claim state. Does NOT mutate the input claim.
 */
export function advanceClaim(
  claim: Claim,
  newStatus: ClaimStatus,
  options: AdvanceClaimOptions
): AdvanceClaimResult {
  if (!canTransitionClaim(claim.status, newStatus)) {
    return {
      ok: false,
      reason: "invalid_transition",
      message: `Cannot transition from '${claim.status}' to '${newStatus}'`,
    };
  }

  const next: Claim = {
    ...claim,
    status: newStatus,
    updatedAt: options.isoTimestamp,
    notes: [...claim.notes],
  };

  if (newStatus === "approved" && options.approvedAmount != null) {
    next.approvedAmount = options.approvedAmount;
  }

  if (options.reason) {
    const note: ClaimNote = {
      noteId: (options.noteIdGenerator ?? (() => `note-${options.isoTimestamp}`))(),
      author: "system",
      content: `Status changed to ${newStatus}: ${options.reason}`,
      createdAt: options.isoTimestamp,
      internal: true,
    };
    next.notes.push(note);
  }

  return { ok: true, claim: next };
}
