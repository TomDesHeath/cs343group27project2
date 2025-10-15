/**
 * JWT utility functions for token generation and verification
 * Handles both access tokens (short-lived) and refresh tokens (long-lived)
 */

import jwt from 'jsonwebtoken';

// Get JWT configuration from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-min-32-chars-quiz-tournament-2025';
const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m'; // 15 minutes
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d'; // 7 days

// Validate JWT_SECRET on module load
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('⚠️  WARNING: Using default JWT_SECRET in production is insecure!');
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Generate an access token (short-lived, typically 15 minutes)
 * Used for API authentication
 */
export function generateAccessToken(payload: JWTPayload): string {
  try {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_ACCESS_EXPIRY as string,
    } as jwt.SignOptions);
  } catch (error) {
    throw new Error('Failed to generate access token');
  }
}

/**
 * Generate a refresh token (long-lived, typically 7 days)
 * Used to obtain new access tokens without re-authentication
 */
export function generateRefreshToken(userId: string): string {
  try {
    return jwt.sign(
      { userId, type: 'refresh' },
      JWT_SECRET,
      {
        expiresIn: JWT_REFRESH_EXPIRY as string,
      } as jwt.SignOptions
    );
  } catch (error) {
    throw new Error('Failed to generate refresh token');
  }
}

/**
 * Generate both access and refresh tokens
 * Convenience function for login/registration
 */
export function generateTokenPair(payload: JWTPayload): TokenPair {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload.userId),
  };
}

/**
 * Verify and decode an access token
 * Returns the decoded payload if valid, null if invalid/expired
 */
export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload & { type?: string };

    // Ensure it's not a refresh token
    if (decoded.type === 'refresh') {
      return null;
    }

    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
  } catch (error) {
    // Token is invalid or expired
    return null;
  }
}

/**
 * Verify and decode a refresh token
 * Returns the userId if valid, null if invalid/expired
 */
export function verifyRefreshToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; type: string };

    // Ensure it's a refresh token
    if (decoded.type !== 'refresh') {
      return null;
    }

    return decoded.userId;
  } catch (error) {
    // Token is invalid or expired
    return null;
  }
}

/**
 * Decode a token without verification
 * Useful for debugging or extracting expired token data
 * WARNING: Do not use for authentication!
 */
export function decodeToken(token: string): any {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
}

/**
 * Get token expiration date
 */
export function getTokenExpiry(token: string): Date | null {
  try {
    const decoded = jwt.decode(token) as { exp?: number };
    if (decoded && decoded.exp) {
      return new Date(decoded.exp * 1000);
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const expiry = getTokenExpiry(token);
  if (!expiry) return true;
  return expiry < new Date();
}
