/**
 * Real OIDC-backed `IdentityProvider`.
 *
 * Calls the issuer's token endpoint with grant_type=password and maps the
 * response into the `AuthenticateResult` shape the rest of the API uses.
 */
import type {
  AuthenticateResult,
  IdentityProvider,
  LoginCredentials,
} from "./identity-provider";

export interface OidcIdentityProviderConfig {
  /** Fully-qualified URL of the token endpoint, e.g. `https://sso.example.com/oauth2/token`. */
  tokenEndpoint: string;
  /** OIDC client_id registered for this API. */
  clientId: string;
  /** Scopes to request; defaults to `openid profile`. */
  scope?: string;
  /** `fetch` override (for tests / instrumentation). Defaults to global fetch. */
  fetch?: typeof fetch;
  /** Timeout for calls to the IdP, milliseconds. Defaults to 5000. */
  timeoutMs?: number;
}

export class OidcIdentityProvider implements IdentityProvider {
  private readonly config: Required<Omit<OidcIdentityProviderConfig, "fetch">> & {
    fetch: typeof fetch;
  };

  constructor(config: OidcIdentityProviderConfig) {
    this.config = {
      tokenEndpoint: config.tokenEndpoint,
      clientId: config.clientId,
      scope: config.scope ?? "openid profile",
      fetch: config.fetch ?? fetch,
      timeoutMs: config.timeoutMs ?? 5000,
    };
  }

  async authenticate(creds: LoginCredentials): Promise<AuthenticateResult> {
    const body = new URLSearchParams({
      grant_type: "password",
      username: creds.username,
      password: creds.password,
      client_id: this.config.clientId,
      scope: this.config.scope,
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

    let response: Response;
    try {
      response = await this.config.fetch(this.config.tokenEndpoint, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
        signal: controller.signal,
      });
    } catch (err) {
      return {
        ok: false,
        error: {
          kind: "idp_unavailable",
          message: `IdP unreachable: ${(err as Error).message}`,
        },
      };
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 400 || response.status === 401) {
      const text = await safeText(response);
      return {
        ok: false,
        error: {
          kind: "invalid_credentials",
          message: extractError(text) ?? "Invalid credentials",
        },
      };
    }

    if (!response.ok) {
      const text = await safeText(response);
      return {
        ok: false,
        error: {
          kind: "idp_unavailable",
          message: `IdP returned ${response.status}: ${text.substring(0, 120)}`,
        },
      };
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      return {
        ok: false,
        error: { kind: "idp_misconfigured", message: "IdP response was not JSON" },
      };
    }

    const parsed = parseTokenResponse(json);
    if (!parsed) {
      return {
        ok: false,
        error: {
          kind: "idp_misconfigured",
          message: "IdP response missing access_token / expires_in",
        },
      };
    }
    return { ok: true, tokens: parsed };
  }
}

interface TokenEndpointResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
}

function parseTokenResponse(body: unknown):
  | {
      accessToken: string;
      refreshToken: string | null;
      idToken: string | null;
      expiresInSeconds: number;
    }
  | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Partial<TokenEndpointResponse>;
  if (typeof b.access_token !== "string" || typeof b.expires_in !== "number") {
    return null;
  }
  return {
    accessToken: b.access_token,
    refreshToken: typeof b.refresh_token === "string" ? b.refresh_token : null,
    idToken: typeof b.id_token === "string" ? b.id_token : null,
    expiresInSeconds: b.expires_in,
  };
}

function extractError(responseText: string): string | null {
  try {
    const parsed = JSON.parse(responseText) as { error?: string; error_description?: string };
    if (parsed.error_description) return parsed.error_description;
    if (parsed.error) return parsed.error;
  } catch {
    /* not JSON */
  }
  return null;
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
