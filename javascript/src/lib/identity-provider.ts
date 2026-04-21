/**
 * Third-party SSO / identity-provider integration boundary.
 *
 * The API does not authenticate users itself — it delegates to an enterprise
 * OIDC identity provider (e.g. Okta, Auth0, Ping, or BofA's internal SSO)
 * via the OAuth 2.0 Resource Owner Password Credentials (ROPC) grant.
 *
 * The `IdentityProvider` interface is the seam that makes this testable: the
 * real implementation (`OidcIdentityProvider`) talks to a live OIDC issuer;
 * tests drop in a fake that talks to `oauth2-mock-server` on an ephemeral
 * port, which issues real RS256-signed JWTs via a real discovery / JWKS
 * endpoint — no "stub JWTs" that diverge from what the real IdP produces.
 */

/** Credentials provided by the end user. */
export interface LoginCredentials {
  username: string;
  password: string;
}

/** Token bundle returned by the IdP on successful authentication. */
export interface IdentityTokens {
  accessToken: string;
  refreshToken: string | null;
  idToken: string | null;
  expiresInSeconds: number;
}

/** Categorised failure modes the API needs to distinguish. */
export type IdentityError =
  | { kind: "invalid_credentials"; message: string }
  | { kind: "idp_unavailable"; message: string }
  | { kind: "idp_misconfigured"; message: string };

/** Result of an authentication attempt. */
export type AuthenticateResult =
  | { ok: true; tokens: IdentityTokens }
  | { ok: false; error: IdentityError };

/** Contract the API uses to authenticate users. */
export interface IdentityProvider {
  /** Exchange end-user credentials for tokens. */
  authenticate(creds: LoginCredentials): Promise<AuthenticateResult>;
}
