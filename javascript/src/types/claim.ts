/** Status of a claim through its lifecycle */
export type ClaimStatus =
  | "submitted"
  | "under_review"
  | "approved"
  | "denied"
  | "settled"
  | "closed";

/** Category of insurance claim */
export type ClaimCategory =
  | "auto_collision"
  | "property_damage"
  | "bodily_injury"
  | "theft"
  | "natural_disaster"
  | "liability"
  | "workers_comp";

/** A document attached to a claim */
export interface ClaimDocument {
  documentId: string;
  fileName: string;
  mimeType: string;
  uploadedAt: string;
  description?: string;
}

/** A note/comment added to a claim by an adjuster or agent */
export interface ClaimNote {
  noteId: string;
  author: string;
  content: string;
  createdAt: string;
  internal: boolean;
}

/** Request body for filing a new claim */
export interface FileClaimRequest {
  /** Policy number the claim is filed against */
  policyNumber: string;
  /** Client ID of the claimant */
  clientId: string;
  /** Category of the claim */
  category: ClaimCategory;
  /** Date the incident occurred (ISO date string) */
  incidentDate: string;
  /** Description of what happened */
  description: string;
  /** Estimated damage amount in USD */
  estimatedAmount: number;
  /** Location where the incident occurred */
  incidentLocation: {
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  /** Contact info for the claimant */
  contactPhone: string;
  contactEmail: string;
}

/** Full claim record */
export interface Claim {
  claimNumber: string;
  policyNumber: string;
  clientId: string;
  category: ClaimCategory;
  status: ClaimStatus;
  filedAt: string;
  incidentDate: string;
  description: string;
  estimatedAmount: number;
  approvedAmount: number | null;
  incidentLocation: {
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  contactPhone: string;
  contactEmail: string;
  assignedAdjuster: string | null;
  documents: ClaimDocument[];
  notes: ClaimNote[];
  updatedAt: string;
}

/** Summary for claim listings */
export interface ClaimSummary {
  claimNumber: string;
  policyNumber: string;
  clientId: string;
  category: ClaimCategory;
  status: ClaimStatus;
  filedAt: string;
  estimatedAmount: number;
  approvedAmount: number | null;
}

/** Response wrapper */
export interface ClaimResponse {
  success: boolean;
  message: string;
  data?: Claim;
}
