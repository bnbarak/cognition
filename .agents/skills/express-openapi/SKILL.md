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
- reused through `$ref` whenever possible

Avoid large inline schemas unless the shape is trivial and used only once.

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
