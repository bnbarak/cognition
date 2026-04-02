import { Router, Request, Response } from "express";
import type {
  Client,
  CreateClientRequest,
  UpdateClientRequest,
  ListClientsQuery,
  PaginatedClientsResponse,
  AddPolicyRequest,
  Policy,
} from "../types/client";

const router = Router();

/** In-memory mock data */
const mockClient: Client = {
  id: "cli_001",
  firstName: "Jane",
  lastName: "Smith",
  email: "jane.smith@example.com",
  phone: "+1-555-0100",
  address: {
    street: "123 Oak Ave",
    city: "Springfield",
    state: "IL",
    zip: "62704",
  },
  dateOfBirth: "1985-03-15",
  policies: [
    {
      id: "pol_001",
      type: "auto",
      provider: "StateFarm",
      policyNumber: "SF-2024-00123",
      premiumAmount: 1200,
      startDate: "2024-01-01",
      endDate: "2025-01-01",
      status: "active",
    },
  ],
  assignedAgentId: "usr_mock_001",
  tags: ["vip", "renewal-due"],
  notes: "Preferred contact method: email",
  createdAt: "2024-01-10T08:00:00Z",
  updatedAt: "2024-06-15T14:30:00Z",
};

/**
 * @openapi
 * /api/clients:
 *   get:
 *     summary: List all clients with pagination, search, and filtering
 *     tags: [Clients]
 *     parameters:
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
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email, or phone
 *       - in: query
 *         name: assignedAgentId
 *         schema:
 *           type: string
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [firstName, lastName, createdAt, updatedAt]
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Paginated list of clients
 */
router.get("/", (req: Request<{}, PaginatedClientsResponse, {}, ListClientsQuery>, res: Response<PaginatedClientsResponse>) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  res.json({
    clients: [mockClient],
    total: 1,
    page,
    limit,
    totalPages: 1,
  });
});

/**
 * @openapi
 * /api/clients/{clientId}:
 *   get:
 *     summary: Get a single client by ID
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Client details
 *       404:
 *         description: Client not found
 */
router.get("/:clientId", (req: Request<{ clientId: string }>, res: Response) => {
  res.json(mockClient);
});

/**
 * @openapi
 * /api/clients:
 *   post:
 *     summary: Create a new client
 *     tags: [Clients]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, phone, address, dateOfBirth, assignedAgentId]
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               address:
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
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               assignedAgentId:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Client created
 *       400:
 *         description: Validation error
 */
router.post("/", (req: Request<{}, Client, CreateClientRequest>, res: Response) => {
  const newClient: Client = {
    id: "cli_" + Date.now(),
    ...req.body,
    policies: [],
    tags: req.body.tags ?? [],
    notes: req.body.notes ?? "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  res.status(201).json(newClient);
});

/**
 * @openapi
 * /api/clients/{clientId}:
 *   put:
 *     summary: Update an existing client
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: object
 *               assignedAgentId:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Client updated
 *       404:
 *         description: Client not found
 */
router.put("/:clientId", (req: Request<{ clientId: string }, Client, UpdateClientRequest>, res: Response) => {
  const updated: Client = {
    ...mockClient,
    ...req.body,
    address: req.body.address ?? mockClient.address,
    id: req.params.clientId,
    updatedAt: new Date().toISOString(),
  };
  res.json(updated);
});

/**
 * @openapi
 * /api/clients/{clientId}/tags:
 *   patch:
 *     summary: Bulk update tags on a client
 *     description: Add or remove multiple tags from a client in a single request. Supports add and remove operations.
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               add:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Tags to add to the client
 *               remove:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Tags to remove from the client
 *     responses:
 *       200:
 *         description: Tags updated successfully
 *       404:
 *         description: Client not found
 */
router.patch("/:clientId/tags", (req: Request<{ clientId: string }, {}, { add?: string[]; remove?: string[] }>, res: Response) => {
  const currentTags = new Set(mockClient.tags);

  // Add new tags
  if (req.body.add) {
    for (const tag of req.body.add) {
      currentTags.add(tag);
    }
  }

  // Remove specified tags
  if (req.body.remove) {
    for (const tag of req.body.remove) {
      currentTags.delete(tag);
    }
  }

  const updatedTags = Array.from(currentTags);
  res.json({
    clientId: req.params.clientId,
    tags: updatedTags,
    added: req.body.add ?? [],
    removed: req.body.remove ?? [],
    message: "Tags updated successfully",
  });
});

/**
 * @openapi
 * /api/clients/{clientId}/policies:
 *   post:
 *     summary: Add a policy to a client
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, provider, policyNumber, premiumAmount, startDate, endDate]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [auto, home, life, health, commercial]
 *               provider:
 *                 type: string
 *               policyNumber:
 *                 type: string
 *               premiumAmount:
 *                 type: number
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Policy added to client
 *       404:
 *         description: Client not found
 */
router.post("/:clientId/policies", (req: Request<{ clientId: string }, Policy, AddPolicyRequest>, res: Response) => {
  const newPolicy: Policy = {
    id: "pol_" + Date.now(),
    ...req.body,
    status: "active",
  };
  res.status(201).json(newPolicy);
});

export default router;
