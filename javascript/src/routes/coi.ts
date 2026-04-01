import { Router, Request, Response } from "express";
import type {
  GenerateCOIRequest,
  CertificateOfInsurance,
  COIResponse,
  COISummary,
  CoverageLine,
  CoverageLimits,
} from "../types/coi";

const router = Router();

/** In-memory store of generated certificates */
const certificates: Map<string, CertificateOfInsurance & { clientId: string; status: "active" | "expired" | "revoked" }> = new Map();

/** Default producer (agency) info */
const PRODUCER = {
  name: "InsureCRM Demo Agency",
  address: "100 Insurance Blvd, Suite 200, Hartford, CT 06103",
  phone: "+1-860-555-0199",
  email: "certs@demo-agency.insurecrm.dev",
};

/**
 * Validates that coverage limits meet minimum requirements per coverage type.
 * Returns an error message if invalid, or null if valid.
 */
function validateCoverageLimits(line: CoverageLine): string | null {
  const { limits } = line;

  switch (line.type) {
    case "general_liability":
      if (!limits.eachOccurrence || limits.eachOccurrence < 100000) {
        return `General liability each-occurrence limit must be at least $100,000 (got ${limits.eachOccurrence})`;
      }
      if (!limits.generalAggregate || limits.generalAggregate < limits.eachOccurrence) {
        return `General liability aggregate must be >= each-occurrence limit`;
      }
      break;

    case "auto_liability":
      if (!limits.combinedSingleLimit || limits.combinedSingleLimit < 50000) {
        return `Auto liability combined single limit must be at least $50,000`;
      }
      break;

    case "workers_comp":
      if (!limits.perAccident || limits.perAccident < 100000) {
        return `Workers comp per-accident limit must be at least $100,000`;
      }
      break;

    case "umbrella":
      if (!limits.eachOccurrence || limits.eachOccurrence < 1000000) {
        return `Umbrella each-occurrence limit must be at least $1,000,000`;
      }
      break;

    case "professional_liability":
      if (!limits.eachOccurrence || limits.eachOccurrence < 250000) {
        return `Professional liability each-occurrence limit must be at least $250,000`;
      }
      break;
  }

  return null;
}

/**
 * Generates a unique certificate number in the format COI-YYYY-XXXXXXXX
 */
function generateCertificateNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `COI-${year}-${random}`;
}

/**
 * Builds the description of operations string, combining user-provided
 * description with auto-generated coverage summary.
 */
function buildDescriptionOfOperations(
  request: GenerateCOIRequest,
  coverageLines: CoverageLine[]
): string {
  const parts: string[] = [];

  if (request.descriptionOfOperations) {
    parts.push(request.descriptionOfOperations);
  }

  // Auto-generate coverage summary
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

/**
 * @openapi
 * /api/coi/generate:
 *   post:
 *     summary: Generate a Certificate of Insurance
 *     description: Takes policy and coverage data and generates a COI JSON document. Validates coverage limits meet minimum requirements per line type.
 *     tags: [Certificates]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clientId, insuredName, insuredAddress, coverageLines, certificateHolder]
 *             properties:
 *               clientId:
 *                 type: string
 *               insuredName:
 *                 type: string
 *               insuredAddress:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   zip:
 *                     type: string
 *               coverageLines:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [general_liability, auto_liability, umbrella, workers_comp, professional_liability]
 *                     policyNumber:
 *                       type: string
 *                     carrier:
 *                       type: string
 *                     effectiveDate:
 *                       type: string
 *                       format: date
 *                     expirationDate:
 *                       type: string
 *                       format: date
 *                     limits:
 *                       type: object
 *               additionalInsureds:
 *                 type: array
 *                 items:
 *                   type: object
 *               waiverOfSubrogation:
 *                 type: object
 *               certificateHolder:
 *                 type: object
 *               descriptionOfOperations:
 *                 type: string
 *     responses:
 *       201:
 *         description: Certificate generated successfully
 *       400:
 *         description: Validation error (missing fields or coverage limits below minimums)
 *       404:
 *         description: Client not found
 */
router.post("/generate", (req: Request<{}, COIResponse, GenerateCOIRequest>, res: Response<COIResponse>) => {
  const request = req.body;

  // Validate required fields
  if (!request.clientId || !request.insuredName || !request.coverageLines?.length) {
    res.status(400).json({
      success: false,
      message: "Missing required fields: clientId, insuredName, and at least one coverageLine are required",
    });
    return;
  }

  // Validate each coverage line's limits
  for (const line of request.coverageLines) {
    const error = validateCoverageLimits(line);
    if (error) {
      res.status(400).json({
        success: false,
        message: `Coverage validation failed: ${error}`,
      });
      return;
    }
  }

  // Validate waiver of subrogation references valid coverage types
  if (request.waiverOfSubrogation) {
    const coveredTypes = new Set(request.coverageLines.map((l) => l.type));
    for (const waiverType of request.waiverOfSubrogation.appliesTo) {
      if (!coveredTypes.has(waiverType)) {
        res.status(400).json({
          success: false,
          message: `Waiver of subrogation references coverage type '${waiverType}' which is not included in the certificate`,
        });
        return;
      }
    }
  }

  // Build the certificate
  const certificateNumber = generateCertificateNumber();
  const certificate: CertificateOfInsurance = {
    certificateNumber,
    issuedAt: new Date().toISOString(),
    producer: PRODUCER,
    insured: {
      name: request.insuredName,
      address: request.insuredAddress,
    },
    coverageLines: request.coverageLines,
    additionalInsureds: request.additionalInsureds ?? [],
    waiverOfSubrogation: request.waiverOfSubrogation ?? null,
    certificateHolder: request.certificateHolder,
    descriptionOfOperations: buildDescriptionOfOperations(request, request.coverageLines),
    cancellationNoticeDays: 30,
    authorizedRepresentative: "Sarah Thompson, Licensed Agent",
  };

  // Store it
  certificates.set(certificateNumber, {
    ...certificate,
    clientId: request.clientId,
    status: "active",
  });

  res.status(201).json({
    success: true,
    message: "Certificate of Insurance generated successfully",
    data: certificate,
  });
});

/**
 * @openapi
 * /api/coi:
 *   get:
 *     summary: List all generated certificates
 *     description: Returns a paginated list of all COI summaries. Supports filtering by client ID and status.
 *     tags: [Certificates]
 *     parameters:
 *       - in: query
 *         name: clientId
 *         schema:
 *           type: string
 *         description: Filter by client ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, expired, revoked]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Paginated list of certificate summaries
 */
router.get("/", (req: Request, res: Response) => {
  const clientId = req.query.clientId as string | undefined;
  const status = req.query.status as string | undefined;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;

  let certs = Array.from(certificates.values());

  if (clientId) {
    certs = certs.filter((c) => c.clientId === clientId);
  }
  if (status) {
    certs = certs.filter((c) => c.status === status);
  }

  const total = certs.length;
  const start = (page - 1) * limit;
  const paged = certs.slice(start, start + limit);

  const summaries: COISummary[] = paged.map((c) => ({
    certificateNumber: c.certificateNumber,
    clientId: c.clientId,
    insuredName: c.insured.name,
    certificateHolderName: c.certificateHolder.name,
    issuedAt: c.issuedAt,
    coverageTypes: c.coverageLines.map((l) => l.type),
    status: c.status,
  }));

  res.json({
    certificates: summaries,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

/**
 * @openapi
 * /api/coi/{certificateNumber}:
 *   get:
 *     summary: Get a certificate by number
 *     description: Returns the full COI document for a given certificate number.
 *     tags: [Certificates]
 *     parameters:
 *       - in: path
 *         name: certificateNumber
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Full certificate details
 *       404:
 *         description: Certificate not found
 */
router.get("/:certificateNumber", (req: Request<{ certificateNumber: string }>, res: Response) => {
  const cert = certificates.get(req.params.certificateNumber);
  if (!cert) {
    res.status(404).json({
      success: false,
      message: `Certificate ${req.params.certificateNumber} not found`,
    });
    return;
  }
  res.json({ success: true, data: cert });
});

/**
 * @openapi
 * /api/coi/{certificateNumber}/revoke:
 *   post:
 *     summary: Revoke a certificate
 *     description: Marks a certificate as revoked. Revoked certificates cannot be reinstated.
 *     tags: [Certificates]
 *     parameters:
 *       - in: path
 *         name: certificateNumber
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for revocation
 *     responses:
 *       200:
 *         description: Certificate revoked
 *       404:
 *         description: Certificate not found
 *       409:
 *         description: Certificate already revoked
 */
router.post("/:certificateNumber/revoke", (req: Request<{ certificateNumber: string }, {}, { reason: string }>, res: Response) => {
  const cert = certificates.get(req.params.certificateNumber);
  if (!cert) {
    res.status(404).json({
      success: false,
      message: `Certificate ${req.params.certificateNumber} not found`,
    });
    return;
  }

  if (cert.status === "revoked") {
    res.status(409).json({
      success: false,
      message: "Certificate is already revoked",
    });
    return;
  }

  cert.status = "revoked";
  res.json({
    success: true,
    message: `Certificate ${req.params.certificateNumber} has been revoked`,
    reason: req.body.reason,
    revokedAt: new Date().toISOString(),
  });
});

/**
 * @openapi
 * /api/coi/{certificateNumber}/verify:
 *   get:
 *     summary: Verify a certificate is valid
 *     description: Public endpoint to verify whether a certificate is currently active and valid. Does not require authentication.
 *     tags: [Certificates]
 *     parameters:
 *       - in: path
 *         name: certificateNumber
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Verification result
 *       404:
 *         description: Certificate not found
 */
router.get("/:certificateNumber/verify", (req: Request<{ certificateNumber: string }>, res: Response) => {
  const cert = certificates.get(req.params.certificateNumber);
  if (!cert) {
    res.status(404).json({
      success: false,
      message: `Certificate ${req.params.certificateNumber} not found`,
      valid: false,
    });
    return;
  }

  // Check if any coverage line has expired
  const now = new Date();
  const hasExpiredCoverage = cert.coverageLines.some(
    (line) => new Date(line.expirationDate) < now
  );

  const isValid = cert.status === "active" && !hasExpiredCoverage;

  res.json({
    success: true,
    certificateNumber: cert.certificateNumber,
    valid: isValid,
    status: cert.status,
    insuredName: cert.insured.name,
    coverageTypes: cert.coverageLines.map((l) => l.type),
    ...(hasExpiredCoverage && { warning: "One or more coverage lines have expired" }),
    ...(cert.status === "revoked" && { reason: "Certificate has been revoked" }),
  });
});

export default router;
