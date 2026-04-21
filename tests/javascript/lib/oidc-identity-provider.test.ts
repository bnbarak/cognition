import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { OAuth2Server } from "oauth2-mock-server";
import { OidcIdentityProvider } from "../../../javascript/src/lib/oidc-identity-provider";

/**
 * ====================================================================
 * Scenario: HARD 2 — introduce a fake third-party dependency.
 *
 * `OidcIdentityProvider` talks to a real OIDC issuer over HTTP. In
 * production that issuer is the enterprise SSO (Okta / Auth0 / LDAP-
 * bridged IdP). Here we spin up `oauth2-mock-server` on an ephemeral
 * port — a real OAuth2/OIDC server that issues RS256-signed JWTs via a
 * real `/token` + `/.well-known/openid-configuration` + JWKS — and
 * point the provider at it. No HTTP mocking, no hand-rolled "fake
 * JWTs": the tests exercise the same wire protocol we'd use against
 * the real IdP.
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
        error_description: "The user credentials are incorrect",
      };
    }
  });
});

afterAll(async () => {
  if (server) await server.stop();
});


describe("OidcIdentityProvider — happy path", () => {
  test("authenticate_validCredentials_returnsTokens", async () => {
    const idp = new OidcIdentityProvider({
      tokenEndpoint,
      clientId: "insurecrm-api",
    });


    const result = await idp.authenticate({
      username: "agent@example.com",
      password: "hunter2",
    });


    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(typeof result.tokens.accessToken).toBe("string");
      expect(result.tokens.accessToken.split(".")).toHaveLength(3);
      expect(result.tokens.expiresInSeconds).toBeGreaterThan(0);
    }
  });

  test("authenticate_accessTokenIsSignedByIssuer", async () => {
    const idp = new OidcIdentityProvider({
      tokenEndpoint,
      clientId: "insurecrm-api",
    });


    const result = await idp.authenticate({
      username: "agent@example.com",
      password: "hunter2",
    });


    expect(result.ok).toBe(true);
    if (result.ok) {
      const [headerB64, payloadB64] = result.tokens.accessToken.split(".");
      const header = JSON.parse(Buffer.from(headerB64, "base64url").toString());
      const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());

      expect(header.alg).toBe("RS256");
      expect(payload.iss).toBe(server.issuer.url);
      expect(payload.sub).toBeTruthy();
    }
  });
});


describe("OidcIdentityProvider — rejected by the IdP", () => {
  test("authenticate_wrongCredentials_returnsInvalidCredentials", async () => {
    const idp = new OidcIdentityProvider({
      tokenEndpoint,
      clientId: "insurecrm-api",
    });


    const result = await idp.authenticate({
      username: "denied@example.com",
      password: "whatever",
    });


    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("invalid_credentials");
      expect(result.error.message).toContain("credentials are incorrect");
    }
  });
});


describe("OidcIdentityProvider — IdP unreachable", () => {
  test("authenticate_connectionRefused_returnsIdpUnavailable", async () => {
    const idp = new OidcIdentityProvider({
      tokenEndpoint: "http://127.0.0.1:1/token",
      clientId: "insurecrm-api",
      timeoutMs: 250,
    });


    const result = await idp.authenticate({
      username: "agent@example.com",
      password: "hunter2",
    });


    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("idp_unavailable");
    }
  });

  test("authenticate_timeout_returnsIdpUnavailable", async () => {
    const slowFetch: typeof fetch = () =>
      new Promise((_resolve, reject) => {
        setTimeout(() => reject(new Error("aborted")), 500);
      });
    const idp = new OidcIdentityProvider({
      tokenEndpoint,
      clientId: "insurecrm-api",
      timeoutMs: 50,
      fetch: slowFetch,
    });


    const result = await idp.authenticate({
      username: "agent@example.com",
      password: "hunter2",
    });


    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("idp_unavailable");
    }
  });
});


describe("OidcIdentityProvider — misconfiguration", () => {
  test("authenticate_idpReturnsHtml_returnsMisconfigured", async () => {
    const htmlFetch: typeof fetch = async () =>
      new Response("<html><body>Login</body></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    const idp = new OidcIdentityProvider({
      tokenEndpoint: "http://127.0.0.1:1/token",
      clientId: "insurecrm-api",
      fetch: htmlFetch,
    });


    const result = await idp.authenticate({
      username: "agent@example.com",
      password: "hunter2",
    });


    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("idp_misconfigured");
    }
  });

  test("authenticate_idpReturnsJsonMissingAccessToken_returnsMisconfigured", async () => {
    const brokenFetch: typeof fetch = async () =>
      new Response(JSON.stringify({ token_type: "bearer" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    const idp = new OidcIdentityProvider({
      tokenEndpoint: "http://127.0.0.1:1/token",
      clientId: "insurecrm-api",
      fetch: brokenFetch,
    });


    const result = await idp.authenticate({
      username: "agent@example.com",
      password: "hunter2",
    });


    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("idp_misconfigured");
      expect(result.error.message).toContain("access_token");
    }
  });
});
