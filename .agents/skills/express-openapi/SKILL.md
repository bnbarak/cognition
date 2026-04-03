# SKILL: TypeScript + Express Controller OpenAPI Annotations

## Goal
When adding or editing Express controllers, always write OpenAPI annotations so the generated spec is complete, accurate, and useful for humans, SDK generation, and AI agents.

This project uses **TypeScript + Express**. The OpenAPI contract must be treated as a **real interface**, not optional documentation.

---

## Core Principle
Every controller endpoint must explicitly document:

- what it does
- what inputs it accepts
- what body it expects
- what it returns
- what errors it can produce
- what auth it requires

Do not rely on inference when accuracy matters.

---

## Preferred Style
Use OpenAPI JSDoc blocks directly above controller route definitions or controller methods.

Keep docs:
- close to the endpoint
- explicit
- schema-driven
- **reused through `$ref` whenever possible**

**Hard rules on `$ref` vs inline:**

1. **ALWAYS use `$ref`** for domain objects (Claim, Client, Certificate, ClaimSummary, etc.) — never inline their full schema in annotations.
2. **ALWAYS use `$ref`** for request body schemas that have 4+ properties. Define them as named components (e.g. `FileClaimRequest`).
3. **ALWAYS use `$ref`** for response wrappers that repeat across endpoints. If `{ success, message, data }` appears in 3+ endpoints, define `SuccessResponse` and `ErrorResponse` components and reference them.
4. **OK to inline** trivial schemas: 1-3 properties, used in only one endpoint, no nesting.

### BAD: Verbose inline schema (40+ lines in the annotation)

```ts
/**
 * @openapi
 * /api/claims:
 *   post:
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [policyNumber, clientId, category, ...]
 *             properties:
 *               policyNumber:
 *                 type: string
 *                 description: Policy number
 *               clientId:
 *                 type: string
 *                 description: Client ID
 *               category:
 *                 type: string
 *                 enum: [auto_collision, property_damage, ...]
 *               # ... 6 more properties inlined ...
 *     responses:
 *       201:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Claim'
 */
```

### GOOD: Use `$ref` for request body and shared response wrapper

```ts
/**
 * @openapi
 * /api/claims:
 *   post:
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FileClaimRequest'
 *     responses:
 *       201:
 *         description: Claim filed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClaimResponse'
 *       400:
 *         description: Validation error — missing required fields or invalid estimatedAmount
 */
```

### Define component schemas separately

Put a single `@openapi` block at the top or bottom of the file defining shared schemas:

```ts
/**
 * @openapi
 * components:
 *   schemas:
 *     FileClaimRequest:
 *       type: object
 *       required: [policyNumber, clientId, category, description, estimatedAmount]
 *       properties:
 *         policyNumber:
 *           type: string
 *           description: Policy number the claim is filed against
 *           example: POL-2026-001
 *         clientId:
 *           type: string
 *         category:
 *           type: string
 *           enum: [auto_collision, property_damage, bodily_injury, theft, natural_disaster, liability, workers_comp]
 *         description:
 *           type: string
 *         estimatedAmount:
 *           type: number
 *           example: 5000
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 */
```

---

## Required Elements for Every Endpoint

Every endpoint annotation should include:

- `tags`
- `summary`
- `description`
- `operationId`
- `parameters` for path/query/header params
- `requestBody` for POST/PUT/PATCH when applicable
- `responses` with explicit success and error cases
- `security` if auth is required

### Conciseness targets

| Endpoint complexity | Target annotation length |
|---|---|
| Simple GET (no body, 1-2 params) | 15-25 lines |
| CRUD with body + params | 25-40 lines |
| Complex (state machine, validation rules) | 40-60 lines |

If an annotation exceeds 60 lines, you are probably inlining schemas that should be `$ref`.

Minimum acceptable shape:

```ts
/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user
 *     description: Returns a single user by ID.
 *     operationId: getUserById
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Unique user ID
 *         schema:
 *           type: string
 *           example: user_123
 *     responses:
 *       '200':
 *         description: User found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       '404':
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
```
