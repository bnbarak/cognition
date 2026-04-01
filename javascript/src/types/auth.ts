/** Credentials for login */
export interface LoginRequest {
  email: string;
  password: string;
}

/** JWT token pair returned on successful authentication */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/** Response wrapper for auth endpoints */
export interface AuthResponse {
  success: boolean;
  message: string;
  data?: AuthTokens;
}

/** Payload for registering a new agency user */
export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  agencyName: string;
  role: "admin" | "agent" | "viewer";
}

/** Registered user profile */
export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  agencyName: string;
  role: "admin" | "agent" | "viewer";
  createdAt: string;
}

/** Request to refresh an expired access token */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/** Request to reset a forgotten password */
export interface ForgotPasswordRequest {
  email: string;
}

/** Request to set a new password using a reset token */
export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}
