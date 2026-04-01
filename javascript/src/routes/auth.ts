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

const router = Router();

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Authenticate an agency user
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
 */
router.post("/login", (req: Request<{}, AuthResponse, LoginRequest>, res: Response<AuthResponse>) => {
  const { email } = req.body;
  res.json({
    success: true,
    message: "Login successful",
    data: {
      accessToken: "mock-jwt-access-token",
      refreshToken: "mock-jwt-refresh-token",
      expiresIn: 3600,
    },
  });
});

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
router.post("/register", (req: Request<{}, AuthResponse & { user?: UserProfile }, RegisterRequest>, res: Response) => {
  const { email, firstName, lastName, agencyName, role } = req.body;
  res.status(201).json({
    success: true,
    message: "Registration successful",
    user: {
      id: "usr_mock_001",
      email,
      firstName,
      lastName,
      agencyName,
      role,
      createdAt: new Date().toISOString(),
    },
  });
});

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh an expired access token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post("/refresh", (req: Request<{}, AuthResponse, RefreshTokenRequest>, res: Response<AuthResponse>) => {
  res.json({
    success: true,
    message: "Token refreshed",
    data: {
      accessToken: "mock-new-access-token",
      refreshToken: "mock-new-refresh-token",
      expiresIn: 3600,
    },
  });
});

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request a password reset email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Password reset email sent
 *       404:
 *         description: Email not found
 */
router.post("/forgot-password", (req: Request<{}, AuthResponse, ForgotPasswordRequest>, res: Response<AuthResponse>) => {
  res.json({
    success: true,
    message: "Password reset email sent. Check your inbox.",
  });
});

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using a token from email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post("/reset-password", (req: Request<{}, AuthResponse, ResetPasswordRequest>, res: Response<AuthResponse>) => {
  res.json({
    success: true,
    message: "Password has been reset successfully",
  });
});

export default router;
