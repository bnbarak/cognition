# SKILL: Annotation Language & Writing Style

## Purpose

This skill grounds the doc-update agent with **concrete examples** of how to write OpenAPI annotation language. It covers summaries, descriptions, error messages, parameter descriptions, and business-context phrasing.

The goal: every annotation the agent writes should read like a **senior engineer wrote it for a human audience**, not like an LLM padded it with filler.

---

## Core Rules

### 1. Summaries: Verb-first, domain-aware, no filler

Summaries are the first thing a developer reads. They must be **short, specific, and action-oriented**.

| BAD | GOOD | WHY |
|-----|------|-----|
| `Get a resource` | `Get a single client by ID` | Says what resource and how |
| `Create resource` | `File a new insurance claim` | Uses domain language |
| `Update the status` | `Transition claim to a new status` | Describes the business action |
| `Delete` | `Revoke a certificate of insurance` | Domain-specific verb |
| `List items` | `List claims with filters and pagination` | Tells the consumer what to expect |
| `Do something with notes` | `Add an internal or external note to a claim` | Precise about the variants |

**Pattern:** `<Verb> <domain noun> [qualifier]`

Good verbs by operation type:
- **POST (create):** File, Register, Generate, Issue, Submit
- **POST (action):** Revoke, Send, Trigger, Assign
- **GET (single):** Get, Retrieve, Look up
- **GET (list):** List, Search, Browse
- **PUT/PATCH (update):** Update, Transition, Reassign, Rename
- **DELETE:** Remove, Revoke, Cancel, Archive

---

### 2. Descriptions: Business context, not code narration

Descriptions explain **why** an endpoint exists and **what business rules apply**. Do NOT restate the summary or describe the HTTP mechanics.

**BAD:**
```yaml
description: This endpoint accepts a POST request with a JSON body and returns a 201 status code.
```

**GOOD:**
```yaml
description: >
  Files a new insurance claim against an existing policy. Validates that required
  fields are present and that the estimated amount is positive. The claim is
  assigned a unique claim number (CLM-YYYY-XXXXXXXX) and starts in "submitted" status.
```

**BAD:**
```yaml
description: Updates the status of a claim.
```

**GOOD:**
```yaml
description: |
  Transitions a claim to a new status. Only certain transitions are allowed:
  - submitted -> under_review, denied
  - under_review -> approved, denied
  - approved -> settled
  - settled -> closed

  When approving, an optional approvedAmount can be set. An optional reason
  adds an internal system note documenting why the transition was made.
```

**Rules:**
- Lead with the business action, not the HTTP method
- Include validation rules if they exist
- Include state machine transitions if the endpoint changes status
- Mention side effects (e.g., "sends a notification email", "creates an audit log entry")
- Use YAML block scalars (`|` or `>`) for multi-line descriptions

---

### 3. Parameter Descriptions: What it is + what it does

Every parameter needs a `description` that tells the consumer **what the value represents** and **how it affects behavior**.

**BAD:**
```yaml
- in: query
  name: status
  schema:
    type: string
```

**GOOD:**
```yaml
- in: query
  name: status
  schema:
    type: string
    enum: [submitted, under_review, approved, denied, settled, closed]
  description: Filter claims to only those with this status
```

**BAD:**
```yaml
- in: path
  name: id
  required: true
  schema:
    type: string
```

**GOOD:**
```yaml
- in: path
  name: claimNumber
  required: true
  schema:
    type: string
  description: Unique claim number (e.g. CLM-2026-ABCD1234)
```

**Rules:**
- Always include `description` on every parameter
- For path params: say what format the ID uses and give an example
- For query params: say how it filters/affects the response
- For enums: the values speak for themselves, but add context about what each means if non-obvious
- Use `example` on fields where the format isn't obvious from the type

---

### 4. Error Responses: Specific about what causes them

Don't just say "Bad request". Say **what input condition** triggers the error.

**BAD:**
```yaml
400:
  description: Bad request
404:
  description: Not found
409:
  description: Conflict
```

**GOOD:**
```yaml
400:
  description: Validation error - missing required fields or estimated amount is not positive
404:
  description: No claim found with the given claim number
409:
  description: Invalid status transition (e.g. cannot move from "closed" to "approved")
423:
  description: Account locked due to too many failed login attempts
```

**Rules:**
- 400: Name the specific validation that failed
- 404: Name the resource that wasn't found
- 409: Describe the conflict condition
- 401/403: Distinguish between "not authenticated" and "not authorized"
- Use a dash or parenthetical to give an example of when it triggers

---

### 5. Response Schemas: Use $ref for shared types, inline for one-offs

**When to use `$ref`:**
- The response type is a domain object used in multiple endpoints (Claim, Client, Certificate)
- The type is defined in a TypeScript interface or Java DTO

**When to inline:**
- Simple wrapper objects (`{ success: boolean, message: string }`)
- One-off response shapes used only by this endpoint

**GOOD pattern — $ref for domain objects:**
```yaml
responses:
  200:
    description: Claim found
    content:
      application/json:
        schema:
          type: object
          properties:
            success:
              type: boolean
              example: true
            data:
              $ref: '#/components/schemas/Claim'
```

**GOOD pattern — inline for simple wrappers:**
```yaml
responses:
  200:
    description: Tags updated successfully
    content:
      application/json:
        schema:
          type: object
          properties:
            clientId:
              type: string
            tags:
              type: array
              items:
                type: string
            message:
              type: string
```

---

### 6. operationId: Consistent naming

Use `camelCase` with the pattern: `<verb><Resource>[Qualifier]`

| Endpoint | operationId |
|----------|-------------|
| `POST /api/claims` | `fileClaim` |
| `GET /api/claims` | `listClaims` |
| `GET /api/claims/:id` | `getClaimByNumber` |
| `PATCH /api/claims/:id/status` | `updateClaimStatus` |
| `POST /api/claims/:id/notes` | `addClaimNote` |
| `PATCH /api/claims/:id/assign` | `assignAdjuster` |
| `POST /api/coi/generate` | `generateCertificate` |
| `GET /api/coi/:id/verify` | `verifyCertificate` |

**Rules:**
- Every endpoint MUST have an `operationId`
- Use domain verbs (file, generate, verify) not generic CRUD (create, read, update)
- The resource noun should match the tag name (Claims -> `*Claim*`, Certificates -> `*Certificate*`)

---

### 7. Tags: One per controller, domain-named

Each controller gets exactly one tag. The tag name is the **business domain**, not the file name.

| Controller File | Tag |
|----------------|-----|
| `auth.ts` | `Auth` |
| `clients.ts` | `Clients` |
| `coi.ts` | `Certificates` |
| `claims.ts` | `Claims` |
| `inbound-email.ts` | `InboundEmail` |

**Rules:**
- PascalCase, singular or plural matching the resource name
- Every endpoint in a controller uses the same tag
- Don't create sub-tags (e.g., avoid `Claims.Notes` or `Claims.Status`)

---

## Full Example: Before and After

### BEFORE (no annotations, just comments):

```ts
/**
 * Assign an adjuster to a claim.
 */
router.patch("/:claimNumber/assign", (req, res) => {
```

### AFTER (grounded annotation):

```ts
/**
 * @openapi
 * /api/claims/{claimNumber}/assign:
 *   patch:
 *     summary: Assign an adjuster to a claim
 *     description: Assigns a named adjuster to handle the specified claim. The adjuster name is recorded and the assignment timestamp is set.
 *     tags: [Claims]
 *     operationId: assignAdjuster
 *     parameters:
 *       - in: path
 *         name: claimNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique claim number (e.g. CLM-2026-ABCD1234)
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
 *         description: No claim found with the given claim number
 */
router.patch("/:claimNumber/assign", (req, res) => {
```

---

## Checklist for Every Annotation

Before committing any annotation, verify:

- [ ] **Summary** is verb-first with a domain noun (not "Get resource")
- [ ] **Description** explains business context (not HTTP mechanics)
- [ ] **operationId** follows `camelCase` `<verb><Resource>` pattern
- [ ] **All parameters** have `description` fields
- [ ] **Path params** include an example of the format
- [ ] **Error responses** explain what condition triggers them
- [ ] **Enums** are present for constrained string fields
- [ ] **$ref** is used for shared domain types
- [ ] **examples** are present on non-obvious fields
- [ ] **Tag** matches the controller's domain name

---

## Anti-Patterns to Avoid

1. **Parrot summaries**: Don't write `summary: Update claim status` and `description: Updates the status of a claim`. The description must add new information.
2. **Generic errors**: Don't write `400: Bad request`. Always explain what validation failed.
3. **Missing operationId**: Every endpoint needs one. SDKs and code generators depend on it.
4. **Type-only schemas**: Don't write `schema: { type: string }` without `description` or `example`. Add context.
5. **Inline everything**: If a response type appears in 3+ endpoints, extract it to `$ref`.
6. **Copy-paste descriptions**: Each endpoint's description should be unique to its business logic. Don't reuse the same template text.
