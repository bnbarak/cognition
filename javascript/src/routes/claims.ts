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
 * @openapi
 * /api/claims:
 *   post:
 *     summary: File a new insurance claim
 *     description: Validates required fields, generates a unique claim number (CLM-YYYY-XXXXXXXX), and creates a new claim record with status 'submitted'.
 *     tags: [Claims]
 *     operationId: fileClaim
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [policyNumber, clientId, category, description, estimatedAmount, incidentDate, incidentLocation, contactPhone, contactEmail]
 *             properties:
 *               policyNumber:
 *                 type: string
 *                 description: Policy number the claim is filed against
 *                 example: POL-2026-001
 *               clientId:
 *                 type: string
 *                 description: Client ID of the claimant
 *                 example: client_abc123
 *               category:
 *                 type: string
 *                 enum: [auto_collision, property_damage, bodily_injury, theft, natural_disaster, liability, workers_comp]
 *                 description: Category of insurance claim
 *               incidentDate:
 *                 type: string
 *                 format: date
 *                 description: Date the incident occurred (ISO date string)
 *               description:
 *                 type: string
 *                 description: Description of what happened
 *               estimatedAmount:
 *                 type: number
 *                 description: Estimated damage amount in USD (must be positive)
 *                 example: 5000
 *               incidentLocation:
 *                 type: object
 *                 properties:
 *                   address:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   zip:
 *                     type: string
 *               contactPhone:
 *                 type: string
 *                 description: Contact phone number for the claimant
 *               contactEmail:
 *                 type: string
 *                 format: email
 *                 description: Contact email for the claimant
 *     responses:
 *       201:
 *         description: Claim filed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Claim filed successfully
 *                 data:
 *                   $ref: '#/components/schemas/Claim'
 *       400:
 *         description: Validation error — missing required fields or invalid estimatedAmount
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
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
 * @openapi
 * /api/claims:
 *   get:
 *     summary: List claims
 *     description: Returns a paginated list of claim summaries. Supports filtering by clientId, status, and category.
 *     tags: [Claims]
 *     operationId: listClaims
 *     parameters:
 *       - in: query
 *         name: clientId
 *         schema:
 *           type: string
 *         description: Filter claims by client ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [submitted, under_review, approved, denied, settled, closed]
 *         description: Filter claims by status
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [auto_collision, property_damage, bodily_injury, theft, natural_disaster, liability, workers_comp]
 *         description: Filter claims by category
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number (1-based)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of results per page
 *     responses:
 *       200:
 *         description: Paginated list of claim summaries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 claims:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ClaimSummary'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
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
 * @openapi
 * /api/claims/{claimNumber}:
 *   get:
 *     summary: Get a single claim
 *     description: Returns the full claim record for a given claim number.
 *     tags: [Claims]
 *     operationId: getClaimByNumber
 *     parameters:
 *       - in: path
 *         name: claimNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique claim number (e.g. CLM-2026-ABCD1234)
 *     responses:
 *       200:
 *         description: Claim found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Claim'
 *       404:
 *         description: Claim not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
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
 * @openapi
 * /api/claims/{claimNumber}/status:
 *   patch:
 *     summary: Update claim status
 *     description: |
 *       Transitions a claim to a new status. Only certain transitions are allowed:
 *       - submitted → under_review, denied
 *       - under_review → approved, denied
 *       - approved → settled
 *       - denied → closed
 *       - settled → closed
 *       - closed → (no transitions)
 *
 *       When approving, an optional `approvedAmount` can be set. An optional `reason` adds an internal system note.
 *     tags: [Claims]
 *     operationId: updateClaimStatus
 *     parameters:
 *       - in: path
 *         name: claimNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique claim number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [submitted, under_review, approved, denied, settled, closed]
 *                 description: New status for the claim
 *               approvedAmount:
 *                 type: number
 *                 description: Approved payout amount (relevant when status is 'approved')
 *               reason:
 *                 type: string
 *                 description: Reason for the status change (added as an internal note)
 *     responses:
 *       200:
 *         description: Claim status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Claim'
 *       404:
 *         description: Claim not found
 *       409:
 *         description: Invalid status transition
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
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
 * @openapi
 * /api/claims/{claimNumber}/notes:
 *   post:
 *     summary: Add a note to a claim
 *     description: Adds a note to the specified claim. Notes can be internal (visible only to adjusters/agents) or external (visible to the claimant).
 *     tags: [Claims]
 *     operationId: addClaimNote
 *     parameters:
 *       - in: path
 *         name: claimNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique claim number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [author, content]
 *             properties:
 *               author:
 *                 type: string
 *                 description: Name or ID of the note author
 *               content:
 *                 type: string
 *                 description: Note content text
 *               internal:
 *                 type: boolean
 *                 default: false
 *                 description: If true, note is only visible to adjusters/agents
 *     responses:
 *       201:
 *         description: Note added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Claim'
 *       400:
 *         description: Missing required fields (author, content)
 *       404:
 *         description: Claim not found
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
 * @openapi
 * /api/claims/{claimNumber}/assign:
 *   patch:
 *     summary: Assign an adjuster to a claim
 *     description: Assigns a named adjuster to handle the specified claim.
 *     tags: [Claims]
 *     operationId: assignAdjuster
 *     parameters:
 *       - in: path
 *         name: claimNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique claim number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [adjusterName]
 *             properties:
 *               adjusterName:
 *                 type: string
 *                 description: Name of the adjuster to assign
 *     responses:
 *       200:
 *         description: Adjuster assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Claim'
 *       400:
 *         description: Missing required field (adjusterName)
 *       404:
 *         description: Claim not found
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
