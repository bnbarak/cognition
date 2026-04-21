import { afterAll, beforeAll, describe, expect, test } from "vitest";
import express, { type Express } from "express";
import request from "supertest";
import type { OAuth2Server } from "oauth2-mock-server";
import { createAuthRouter } from "./auth";
import { OidcIdentityProvider } from "../lib/oidc-identity-provider";

/**
 * ====================================================================
 * Scenario: HARD 2 (integration) — /auth/login against a real fake SSO.
 *
 * Boots an Express app with `createAuthRouter({ identityProvider })`
 * wired to `oauth2-mock-server`, then drives it with `supertest`. The
 * lockout clock is controlled by a fake `now()` so the 15-minute
 * window is deterministic and the test runs in milliseconds.
 * ====================================================================
 */

let server: OAuth2Server;
let tokenEndpoint: string;

beforeAll(async () => {
  const { OAuth2Server } = await import("oauth2-mock-server");
  server = new OAuth2Server();
  await server.issuer.keys.generate("RS256");
  await server.start(0, "127.0.0.1");
  tokenEndpoint = `${server.issuer.url}/token`;

  server.service.on("beforeResponse", (response: { statusCode: number; body: unknown }, req: { body?: Record<string, string> }) => {
    if (req.body?.grant_type === "password" && req.body?.username === "denied@example.com") {
      response.statusCode = 400;
      response.body = {
        error: "invalid_grant",
        error_description: "Bad credentials",
      };
    }
  });
});

afterAll(async () => {
  if (server) await server.stop();
});

function buildApp(overrides: { now?: () => number; lockoutMs?: number; maxAttempts?: number } = {}): Express {
  const idp = new OidcIdentityProvider({
    tokenEndpoint,
    clientId: "insurecrm-api",
  });
  const app = express();
  app.use(express.json());
  app.use(
    "/api/auth",
    createAuthRouter({
      identityProvider: idp,
      now: overrides.now,
      lockoutMs: overrides.lockoutMs,
      maxAttempts: overrides.maxAttempts,
    })
  );
  return app;
}


describe("POST /api/auth/login", () => {
  test("login_validCredentials_returns200WithTokens", async () => {
    const app = buildApp();


    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "agent@example.com", password: "hunter2" });


    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken.split(".")).toHaveLength(3);
    expect(res.body.data.expiresIn).toBeGreaterThan(0);
  });

  test("login_missingPassword_returns400", async () => {
    const app = buildApp();


    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "agent@example.com" });


    expect(res.status).toBe(400);
    expect(res.body.message).toContain("password");
  });

  test("login_wrongCredentials_returns401", async () => {
    const app = buildApp();


    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "denied@example.com", password: "whatever" });


    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("login_idpUnavailable_returns503", async () => {
    const idp = new OidcIdentityProvider({
      tokenEndpoint: "http://127.0.0.1:1/token",
      clientId: "insurecrm-api",
      timeoutMs: 100,
    });
    const app = express();
    app.use(express.json());
    app.use("/api/auth", createAuthRouter({ identityProvider: idp }));


    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "agent@example.com", password: "hunter2" });


    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
  });
});


describe("POST /api/auth/login — rate-limiter lockout (fake clock)", () => {
  test("login_fiveFailures_locksAccountFor15Minutes", async () => {
    let t = 1_700_000_000_000;
    const app = buildApp({ now: () => t, lockoutMs: 15 * 60 * 1000, maxAttempts: 5 });


    for (let i = 0; i < 5; i++) {
      await request(app)
        .post("/api/auth/login")
        .send({ email: "denied@example.com", password: "whatever" });
    }
    const locked = await request(app)
      .post("/api/auth/login")
      .send({ email: "denied@example.com", password: "whatever" });


    expect(locked.status).toBe(423);
    expect(locked.body.message).toContain("Account locked");
  });

  test("login_lockoutExpiresAfter15Minutes", async () => {
    let t = 1_700_000_000_000;
    const app = buildApp({ now: () => t, lockoutMs: 15 * 60 * 1000, maxAttempts: 5 });
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post("/api/auth/login")
        .send({ email: "denied@example.com", password: "whatever" });
    }


    t += 15 * 60 * 1000 + 1;
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "denied@example.com", password: "whatever" });


    expect(res.status).toBe(401);
  });

  test("login_successResetsFailureCounter", async () => {
    let t = 1_700_000_000_000;
    const app = buildApp({ now: () => t, maxAttempts: 5 });
    for (let i = 0; i < 4; i++) {
      await request(app)
        .post("/api/auth/login")
        .send({ email: "agent@example.com", password: "wrong" });
    }


    await request(app)
      .post("/api/auth/login")
      .send({ email: "agent@example.com", password: "hunter2" });
    for (let i = 0; i < 4; i++) {
      await request(app)
        .post("/api/auth/login")
        .send({ email: "agent@example.com", password: "wrong" });
    }
    const stillOk = await request(app)
      .post("/api/auth/login")
      .send({ email: "agent@example.com", password: "hunter2" });


    expect(stillOk.status).toBe(200);
  });
});
