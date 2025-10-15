/**
 * Authentication Middleware
 * Middleware functions for protecting routes and role-based access control
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

/**
 * Require valid JWT access token
 * Extracts token from Authorization header, verifies it, and attaches user to request
 * Returns 401 if token is missing or invalid
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'No token provided',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = verifyAccessToken(token);

    if (!payload) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
      return;
    }

    // Attach user and token to request
    req.user = payload;
    req.token = token;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}

/**
 * Optional authentication
 * Attempts to extract and verify token, but doesn't fail if token is missing
 * Useful for routes that work with or without authentication
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      // Verify token
      const payload = verifyAccessToken(token);

      if (payload) {
        // Attach user and token to request if valid
        req.user = payload;
        req.token = token;
      }
    }

    // Continue regardless of token validity
    next();
  } catch (error) {
    // Continue even if verification fails
    next();
  }
}

// ============================================
// ROLE-BASED ACCESS CONTROL
// ============================================

/**
 * Require ADMIN role
 * Must be used AFTER requireAuth middleware
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
      return;
    }

    if (req.user.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(403).json({
      success: false,
      error: 'Authorization failed',
    });
  }
}

/**
 * Require USER or ADMIN role (any authenticated user)
 * This is essentially an alias for requireAuth but more explicit
 */
export const requireUser = requireAuth;

// ============================================
// UTILITIES
// ============================================

/**
 * Check if request is from authenticated user
 */
export function isAuthenticated(req: Request): boolean {
  return !!req.user;
}

/**
 * Check if request is from admin user
 */
export function isAdmin(req: Request): boolean {
  return req.user?.role === 'ADMIN';
}

/**
 * Get user ID from request
 */
export function getUserId(req: Request): string | undefined {
  return req.user?.userId;
}
