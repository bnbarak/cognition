import { Router, Request, Response } from "express";
import type {
  LoginRequest,
  AuthResponse,
  RegisterRequest,
  UserProfile,
  RefreshTokenRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from "../types/auth";
import type { IdentityProvider } from "../lib/identity-provider";
import { OidcIdentityProvider } from "../lib/oidc-identity-provider";

/** Dependencies that make the auth router testable. */
export interface AuthRouterDeps {
  /** Third-party SSO / IdP that validates user credentials. */
  identityProvider: IdentityProvider;
  /** Injectable clock for the rate-limiter lockout window. Defaults to `Date.now`. */
  now?: () => number;
  /** Injectable lockout window in milliseconds. Defaults to 15 minutes. */
  lockoutMs?: number;
  /** Failed attempts before lockout kicks in. Defaults to 5. */
  maxAttempts?: number;
}

interface AttemptRecord {
  failures: number;
  lockedUntil: number | null;
}

/**
 * Build an auth router against the supplied IdP + clock. Exported so tests can
 * wire in a fake IdP (via `oauth2-mock-server`) and a controllable clock
 * without mocking HTTP or faking out `Date`.
 */
export function createAuthRouter(deps: AuthRouterDeps): Router {
  const router = Router();
  const now = deps.now ?? Date.now;
  const lockoutMs = deps.lockoutMs ?? 15 * 60 * 1000;
  const maxAttempts = deps.maxAttempts ?? 5;
  const attempts: Map<string, AttemptRecord> = new Map();

  function recordFailure(email: string): AttemptRecord {
    const current = attempts.get(email) ?? { failures: 0, lockedUntil: null };
    current.failures += 1;
    if (current.failures >= maxAttempts) {
      current.lockedUntil = now() + lockoutMs;
      current.failures = 0;
    }
    attempts.set(email, current);
    return current;
  }

  function clearAttempts(email: string): void {
    attempts.delete(email);
  }

  function lockoutFor(email: string): AttemptRecord | null {
    const record = attempts.get(email);
    if (!record?.lockedUntil) return null;
    if (now() >= record.lockedUntil) {
      attempts.delete(email);
      return null;
    }
    return record;
  }

  /**
   * @openapi
   * /api/auth/login:
   *   post:
   *     summary: Authenticate an agency user via the enterprise OIDC identity provider
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password]
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *               password:
   *                 type: string
   *     responses:
   *       200:
   *         description: Successfully authenticated
   *       401:
   *         description: Invalid credentials
   *       423:
   *         description: Account locked due to too many failed attempts
   *       503:
   *         description: Identity provider unavailable
   */
  router.post(
    "/login",
    async (req: Request<{}, AuthResponse, LoginRequest>, res: Response<AuthResponse>) => {
      const { email, password } = req.body ?? ({} as LoginRequest);

      if (!email || !password) {
        res.status(400).json({
          success: false,
          message: "email and password are required",
        });
        return;
      }

      const locked = lockoutFor(email);
      if (locked) {
        const remainingMs = (locked.lockedUntil ?? 0) - now();
        const remainingMin = Math.ceil(remainingMs / 60_000);
        res.status(423).json({
          success: false,
          message: `Account locked. Try again in ${remainingMin} minute(s).`,
        });
        return;
      }

      const result = await deps.identityProvider.authenticate({
        username: email,
        password,
      });

      if (!result.ok) {
        if (result.error.kind === "invalid_credentials") {
          recordFailure(email);
          res.status(401).json({
            success: false,
            message: "Invalid credentials",
          });
          return;
        }
        if (result.error.kind === "idp_unavailable") {
          res.status(503).json({
            success: false,
            message: "Identity provider is unavailable. Please try again shortly.",
          });
          return;
        }
        res.status(502).json({
          success: false,
          message: `Identity provider returned an unexpected response: ${result.error.message}`,
        });
        return;
      }

      clearAttempts(email);

      res.json({
        success: true,
        message: "Login successful",
        data: {
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken ?? "",
          expiresIn: result.tokens.expiresInSeconds,
        },
      });
    }
  );

  /**
   * @openapi
   * /api/auth/register:
   *   post:
   *     summary: Register a new agency user
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password, firstName, lastName, agencyName, role]
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *               password:
   *                 type: string
   *               firstName:
   *                 type: string
   *               lastName:
   *                 type: string
   *               agencyName:
   *                 type: string
   *               role:
   *                 type: string
   *                 enum: [admin, agent, viewer]
   *     responses:
   *       201:
   *         description: User registered successfully
   *       409:
   *         description: Email already in use
   */
  router.post(
    "/register",
    (req: Request<{}, AuthResponse & { user?: UserProfile }, RegisterRequest>, res: Response) => {
      const { email, firstName, lastName, agencyName, role } = req.body;
      const agencyId = "agency_" + Math.random().toString(36).substring(2, 10);
      res.status(201).json({
        success: true,
        message: "Registration successful",
        user: {
          id: "usr_mock_001",
          email,
          firstName,
          lastName,
          agencyName,
          agencyId,
          role,
          createdAt: new Date().toISOString(),
        },
      });
    }
  );

  /**
   * @openapi
   * /api/auth/refresh:
   *   post:
   *     summary: Refresh an expired access token
   *     tags: [Auth]
   */
  router.post(
    "/refresh",
    (_req: Request<{}, AuthResponse, RefreshTokenRequest>, res: Response<AuthResponse>) => {
      res.json({
        success: true,
        message: "Token refreshed",
        data: {
          accessToken: "mock-new-access-token",
          refreshToken: "mock-new-refresh-token",
          expiresIn: 3600,
        },
      });
    }
  );

  /**
   * @openapi
   * /api/auth/forgot-password:
   *   post:
   *     summary: Request a password reset email
   *     tags: [Auth]
   */
  router.post(
    "/forgot-password",
    (_req: Request<{}, AuthResponse, ForgotPasswordRequest>, res: Response<AuthResponse>) => {
      res.json({
        success: true,
        message: "If an account exists for this email, a reset link has been sent.",
      });
    }
  );

  /**
   * @openapi
   * /api/auth/reset-password:
   *   post:
   *     summary: Set a new password using a reset token
   *     tags: [Auth]
   */
  router.post(
    "/reset-password",
    (_req: Request<{}, AuthResponse, ResetPasswordRequest>, res: Response<AuthResponse>) => {
      res.json({
        success: true,
        message: "Password has been reset.",
      });
    }
  );

  return router;
}

/**
 * Default auth router wired against the OIDC issuer configured via env vars.
 * Used by `src/app.ts`. Tests should construct their own router with
 * `createAuthRouter({ identityProvider: fakeIdp })`.
 */
const defaultIdp = new OidcIdentityProvider({
  tokenEndpoint:
    process.env.OIDC_TOKEN_ENDPOINT ??
    "https://sso.example.invalid/oauth2/token",
  clientId: process.env.OIDC_CLIENT_ID ?? "insurecrm-api",
  scope: process.env.OIDC_SCOPE ?? "openid profile",
});

const defaultRouter = createAuthRouter({ identityProvider: defaultIdp });

export default defaultRouter;
