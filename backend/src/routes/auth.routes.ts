/**
 * Authentication Routes
 * Express router for all authentication endpoints
 */

import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';
import {
  validateRegister,
  validateLogin,
  validateRefreshToken,
  validateUpdateProfile,
  validateChangePassword,
} from '../middleware/validation';

const router = Router();

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

/**
 * POST /api/auth/register
 * Register a new user
 * Body: { username, email, password, avatarUrl? }
 * Returns: { user, accessToken } + refreshToken cookie
 */
router.post('/register', validateRegister, authController.register);

/**
 * POST /api/auth/login
 * Login existing user
 * Body: { email, password }
 * Returns: { user, accessToken } + refreshToken cookie
 */
router.post('/login', validateLogin, authController.login);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 * Body: { refreshToken? } (or from cookie)
 * Returns: { accessToken }
 */
router.post('/refresh', validateRefreshToken, authController.refresh);

// ============================================
// PROTECTED ROUTES (Authentication required)
// ============================================

/**
 * POST /api/auth/logout
 * Logout current user
 * Requires: Valid access token
 * Returns: { message }
 */
router.post('/logout', requireAuth, authController.logout);

/**
 * POST /api/auth/logout-all
 * Logout from all devices
 * Requires: Valid access token
 * Returns: { message }
 */
router.post('/logout-all', requireAuth, authController.logoutAll);

/**
 * GET /api/auth/me
 * Get current user profile
 * Requires: Valid access token
 * Returns: { user }
 */
router.get('/me', requireAuth, authController.getProfile);

/**
 * PATCH /api/auth/profile
 * Update user profile
 * Requires: Valid access token
 * Body: { username?, email?, avatarUrl? }
 * Returns: { user }
 */
router.patch(
  '/profile',
  requireAuth,
  validateUpdateProfile,
  authController.updateProfile
);

/**
 * POST /api/auth/change-password
 * Change user password
 * Requires: Valid access token
 * Body: { currentPassword, newPassword }
 * Returns: { message }
 */
router.post(
  '/change-password',
  requireAuth,
  validateChangePassword,
  authController.changePassword
);

export default router;
