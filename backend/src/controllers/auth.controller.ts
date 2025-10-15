/**
 * Authentication Controllers
 * Express route handlers for authentication endpoints
 */

import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { ZodError } from 'zod';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Set refresh token as httpOnly cookie
 */
function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  });
}

/**
 * Clear refresh token cookie
 */
function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
}

/**
 * Handle errors and send appropriate response
 */
function handleError(res: Response, error: unknown): Response {
  console.error('Auth controller error:', error);

  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: error.issues,
    });
  }

  if (error instanceof Error) {
    // Handle specific error messages
    if (
      error.message.includes('already registered') ||
      error.message.includes('already taken')
    ) {
      return res.status(409).json({
        success: false,
        error: error.message,
      });
    }

    if (
      error.message.includes('Invalid email or password') ||
      error.message.includes('Invalid refresh token') ||
      error.message.includes('Current password is incorrect')
    ) {
      return res.status(401).json({
        success: false,
        error: error.message,
      });
    }

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    if (error.message.includes('expired')) {
      return res.status(401).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }

  return res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
}

// ============================================
// CONTROLLERS
// ============================================

/**
 * POST /api/auth/register
 * Register a new user
 */
export async function register(req: Request, res: Response): Promise<Response> {
  try {
    const { username, email, password, avatarUrl } = req.body;

    const result = await authService.register({
      username,
      email,
      password,
      avatarUrl,
    });

    // Set refresh token as httpOnly cookie
    setRefreshTokenCookie(res, result.refreshToken);

    return res.status(201).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * POST /api/auth/login
 * Login existing user
 */
export async function login(req: Request, res: Response): Promise<Response> {
  try {
    const { email, password } = req.body;

    const result = await authService.login({
      email,
      password,
    });

    // Set refresh token as httpOnly cookie
    setRefreshTokenCookie(res, result.refreshToken);

    return res.status(200).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * POST /api/auth/logout
 * Logout current user
 */
export async function logout(req: Request, res: Response): Promise<Response> {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    // Clear refresh token cookie
    clearRefreshTokenCookie(res);

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * POST /api/auth/logout-all
 * Logout from all devices
 */
export async function logoutAll(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
    }

    await authService.logoutAllDevices(req.user.userId);

    // Clear refresh token cookie
    clearRefreshTokenCookie(res);

    return res.status(200).json({
      success: true,
      message: 'Logged out from all devices successfully',
    });
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
export async function refresh(req: Request, res: Response): Promise<Response> {
  try {
    // Get refresh token from cookie or body
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token required',
      });
    }

    const result = await authService.refreshAccessToken(refreshToken);

    return res.status(200).json({
      success: true,
      data: {
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    // Clear invalid refresh token cookie
    clearRefreshTokenCookie(res);
    return handleError(res, error);
  }
}

/**
 * GET /api/auth/me
 * Get current user profile
 */
export async function getProfile(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
    }

    const user = await authService.getUserById(req.user.userId);

    return res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * PATCH /api/auth/profile
 * Update user profile
 */
export async function updateProfile(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
    }

    const { username, email, avatarUrl } = req.body;

    const user = await authService.updateProfile(req.user.userId, {
      username,
      email,
      avatarUrl,
    });

    return res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * POST /api/auth/change-password
 * Change user password
 */
export async function changePassword(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
    }

    const { currentPassword, newPassword } = req.body;

    await authService.changePassword(
      req.user.userId,
      currentPassword,
      newPassword
    );

    // Clear refresh token cookie (user is logged out from all devices)
    clearRefreshTokenCookie(res);

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please login again.',
    });
  } catch (error) {
    return handleError(res, error);
  }
}
