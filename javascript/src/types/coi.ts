/** Coverage line on a Certificate of Insurance */
export interface CoverageLine {
  type: "general_liability" | "auto_liability" | "umbrella" | "workers_comp" | "professional_liability";
  policyNumber: string;
  carrier: string;
  effectiveDate: string;
  expirationDate: string;
  limits: CoverageLimits;
}

/** Limit amounts for a coverage line (all amounts in USD) */
export interface CoverageLimits {
  /** Per-occurrence limit */
  eachOccurrence: number;
  /** General aggregate limit */
  generalAggregate?: number;
  /** Products / completed operations aggregate */
  productsCompletedOps?: number;
  /** Personal & advertising injury limit */
  personalAdvertisingInjury?: number;
  /** Damage to rented premises */
  damageToRentedPremises?: number;
  /** Medical expense per person */
  medicalExpense?: number;
  /** Combined single limit (for auto) */
  combinedSingleLimit?: number;
  /** Per-accident limit (for workers comp) */
  perAccident?: number;
  /** Per-employee limit (for workers comp) */
  perEmployee?: number;
  /** Policy limit */
  policyLimit?: number;
}

/** Additional insured party on the certificate */
export interface AdditionalInsured {
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  relationship: string;
}

/** Waiver of subrogation configuration */
export interface WaiverOfSubrogation {
  /** Which coverage lines have waiver of subrogation */
  appliesTo: CoverageLine["type"][];
  /** Free-text description of the waiver */
  description: string;
}

/** Request body for generating a COI */
export interface GenerateCOIRequest {
  /** Client ID the COI is for */
  clientId: string;
  /** Named insured (policyholder) */
  insuredName: string;
  insuredAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  /** Coverage lines to include on the certificate */
  coverageLines: CoverageLine[];
  /** Additional insured parties */
  additionalInsureds?: AdditionalInsured[];
  /** Waiver of subrogation details */
  waiverOfSubrogation?: WaiverOfSubrogation;
  /** Certificate holder (who requested the COI) */
  certificateHolder: {
    name: string;
    address: {
      street: string;
      city: string;
      state: string;
      zip: string;
    };
  };
  /** Free-text description of operations/locations/vehicles */
  descriptionOfOperations?: string;
}

/** The generated Certificate of Insurance */
export interface CertificateOfInsurance {
  /** Unique certificate number */
  certificateNumber: string;
  /** ISO timestamp of when the certificate was generated */
  issuedAt: string;
  /** Producer (agency) information */
  producer: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  /** Named insured */
  insured: {
    name: string;
    address: {
      street: string;
      city: string;
      state: string;
      zip: string;
    };
  };
  /** All coverage lines on the certificate */
  coverageLines: CoverageLine[];
  /** Additional insured parties */
  additionalInsureds: AdditionalInsured[];
  /** Waiver of subrogation */
  waiverOfSubrogation: WaiverOfSubrogation | null;
  /** Certificate holder */
  certificateHolder: {
    name: string;
    address: {
      street: string;
      city: string;
      state: string;
      zip: string;
    };
  };
  /** Description of operations */
  descriptionOfOperations: string;
  /** Cancellation notice period in days */
  cancellationNoticeDays: number;
  /** Agent who issued the certificate */
  authorizedRepresentative: string;
}

/** Response wrapper for COI operations */
export interface COIResponse {
  success: boolean;
  message: string;
  data?: CertificateOfInsurance;
}

/** Summary of a COI for listing */
export interface COISummary {
  certificateNumber: string;
  clientId: string;
  insuredName: string;
  certificateHolderName: string;
  issuedAt: string;
  coverageTypes: string[];
  status: "active" | "expired" | "revoked";
}
