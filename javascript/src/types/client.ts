/** Insurance policy type */
export type PolicyType = "auto" | "home" | "life" | "health" | "commercial";

/** A policy associated with a client */
export interface Policy {
  id: string;
  type: PolicyType;
  provider: string;
  policyNumber: string;
  premiumAmount: number;
  startDate: string;
  endDate: string;
  status: "active" | "expired" | "cancelled";
}

/** Full client record in the CRM */
export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  dateOfBirth: string;
  policies: Policy[];
  assignedAgentId: string;
  tags: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

/** Request body for creating a new client */
export interface CreateClientRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  dateOfBirth: string;
  assignedAgentId: string;
  tags?: string[];
  notes?: string;
}

/** Request body for updating an existing client */
export interface UpdateClientRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  assignedAgentId?: string;
  tags?: string[];
  notes?: string;
}

/** Query parameters for listing clients */
export interface ListClientsQuery {
  page?: number;
  limit?: number;
  search?: string;
  assignedAgentId?: string;
  tag?: string;
  sortBy?: "firstName" | "lastName" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

/** Paginated response for client listings */
export interface PaginatedClientsResponse {
  clients: Client[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Request to add a policy to a client */
export interface AddPolicyRequest {
  type: PolicyType;
  provider: string;
  policyNumber: string;
  premiumAmount: number;
  startDate: string;
  endDate: string;
}
