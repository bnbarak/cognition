import { Router, Request, Response } from "express";
import type {
  FileClaimRequest,
  Claim,
  ClaimResponse,
  ClaimSummary,
  ClaimStatus,
  ClaimNote,
} from "../types/claim";

const router = Router();

/** In-memory store of claims */
const claims: Map<string, Claim> = new Map();

/**
 * Generates a unique claim number in the format CLM-YYYY-XXXXXXXX
 */
function generateClaimNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `CLM-${year}-${random}`;
}

/**
 * File a new insurance claim.
 * Validates required fields, assigns a claim number, and stores it.
 */
router.post("/", (req: Request<{}, ClaimResponse, FileClaimRequest>, res: Response<ClaimResponse>) => {
  const body = req.body;

  if (!body.policyNumber || !body.clientId || !body.category || !body.description) {
    res.status(400).json({
      success: false,
      message: "Missing required fields: policyNumber, clientId, category, and description are required",
    });
    return;
  }

  if (!body.estimatedAmount || body.estimatedAmount <= 0) {
    res.status(400).json({
      success: false,
      message: "estimatedAmount must be a positive number",
    });
    return;
  }

  const claimNumber = generateClaimNumber();
  const now = new Date().toISOString();

  const claim: Claim = {
    claimNumber,
    policyNumber: body.policyNumber,
    clientId: body.clientId,
    category: body.category,
    status: "submitted",
    filedAt: now,
    incidentDate: body.incidentDate,
    description: body.description,
    estimatedAmount: body.estimatedAmount,
    approvedAmount: null,
    incidentLocation: body.incidentLocation,
    contactPhone: body.contactPhone,
    contactEmail: body.contactEmail,
    assignedAdjuster: null,
    documents: [],
    notes: [],
    updatedAt: now,
  };

  claims.set(claimNumber, claim);

  res.status(201).json({
    success: true,
    message: "Claim filed successfully",
    data: claim,
  });
});

/**
 * List all claims with optional filters.
 * Supports filtering by clientId, status, and category.
 */
router.get("/", (req: Request, res: Response) => {
  const clientId = req.query.clientId as string | undefined;
  const status = req.query.status as string | undefined;
  const category = req.query.category as string | undefined;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;

  let results = Array.from(claims.values());

  if (clientId) {
    results = results.filter((c) => c.clientId === clientId);
  }
  if (status) {
    results = results.filter((c) => c.status === status);
  }
  if (category) {
    results = results.filter((c) => c.category === category);
  }

  const total = results.length;
  const start = (page - 1) * limit;
  const paged = results.slice(start, start + limit);

  const summaries: ClaimSummary[] = paged.map((c) => ({
    claimNumber: c.claimNumber,
    policyNumber: c.policyNumber,
    clientId: c.clientId,
    category: c.category,
    status: c.status,
    filedAt: c.filedAt,
    estimatedAmount: c.estimatedAmount,
    approvedAmount: c.approvedAmount,
  }));

  res.json({
    claims: summaries,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

/**
 * Get a single claim by its claim number.
 */
router.get("/:claimNumber", (req: Request<{ claimNumber: string }>, res: Response) => {
  const claim = claims.get(req.params.claimNumber);
  if (!claim) {
    res.status(404).json({
      success: false,
      message: `Claim ${req.params.claimNumber} not found`,
    });
    return;
  }
  res.json({ success: true, data: claim });
});

/**
 * Update the status of a claim (e.g., move to under_review, approved, denied).
 * Only certain transitions are allowed.
 */
router.patch("/:claimNumber/status", (req: Request<{ claimNumber: string }, {}, { status: ClaimStatus; approvedAmount?: number; reason?: string }>, res: Response) => {
  const claim = claims.get(req.params.claimNumber);
  if (!claim) {
    res.status(404).json({
      success: false,
      message: `Claim ${req.params.claimNumber} not found`,
    });
    return;
  }

  const newStatus = req.body.status;
  const validTransitions: Record<ClaimStatus, ClaimStatus[]> = {
    submitted: ["under_review", "denied"],
    under_review: ["approved", "denied"],
    approved: ["settled"],
    denied: ["closed"],
    settled: ["closed"],
    closed: [],
  };

  if (!validTransitions[claim.status]?.includes(newStatus)) {
    res.status(409).json({
      success: false,
      message: `Cannot transition from '${claim.status}' to '${newStatus}'`,
    });
    return;
  }

  if (newStatus === "approved" && req.body.approvedAmount != null) {
    claim.approvedAmount = req.body.approvedAmount;
  }

  claim.status = newStatus;
  claim.updatedAt = new Date().toISOString();

  if (req.body.reason) {
    claim.notes.push({
      noteId: `note-${Date.now()}`,
      author: "system",
      content: `Status changed to ${newStatus}: ${req.body.reason}`,
      createdAt: claim.updatedAt,
      internal: true,
    });
  }

  res.json({
    success: true,
    message: `Claim status updated to '${newStatus}'`,
    data: claim,
  });
});

/**
 * Add a note to a claim.
 * Notes can be internal (visible only to adjusters/agents) or external (visible to claimant).
 */
router.post("/:claimNumber/notes", (req: Request<{ claimNumber: string }, {}, { author: string; content: string; internal?: boolean }>, res: Response) => {
  const claim = claims.get(req.params.claimNumber);
  if (!claim) {
    res.status(404).json({
      success: false,
      message: `Claim ${req.params.claimNumber} not found`,
    });
    return;
  }

  if (!req.body.author || !req.body.content) {
    res.status(400).json({
      success: false,
      message: "author and content are required",
    });
    return;
  }

  const note: ClaimNote = {
    noteId: `note-${Date.now()}`,
    author: req.body.author,
    content: req.body.content,
    createdAt: new Date().toISOString(),
    internal: req.body.internal ?? false,
  };

  claim.notes.push(note);
  claim.updatedAt = note.createdAt;

  res.status(201).json({
    success: true,
    message: "Note added to claim",
    data: claim,
  });
});

/**
 * Assign an adjuster to a claim.
 */
router.patch("/:claimNumber/assign", (req: Request<{ claimNumber: string }, {}, { adjusterName: string }>, res: Response) => {
  const claim = claims.get(req.params.claimNumber);
  if (!claim) {
    res.status(404).json({
      success: false,
      message: `Claim ${req.params.claimNumber} not found`,
    });
    return;
  }

  if (!req.body.adjusterName) {
    res.status(400).json({
      success: false,
      message: "adjusterName is required",
    });
    return;
  }

  claim.assignedAdjuster = req.body.adjusterName;
  claim.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    message: `Adjuster '${req.body.adjusterName}' assigned to claim ${req.params.claimNumber}`,
    data: claim,
  });
});

export default router;
