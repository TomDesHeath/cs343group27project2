/**
 * Validation schemas using Zod
 * Validates incoming request data for authentication endpoints
 */

import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// ============================================
// VALIDATION SCHEMAS
// ============================================

/**
 * Registration schema
 * Requirements:
 * - username: 3-50 characters, alphanumeric with underscores
 * - email: valid email format
 * - password: min 8 chars, 1 uppercase, 1 lowercase, 1 number
 * - avatarUrl: optional, valid URL
 */
export const registerSchema = z.object({
  body: z.object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(50, 'Username must be at most 50 characters')
      .regex(
        /^[a-zA-Z0-9_]+$/,
        'Username can only contain letters, numbers, and underscores'
      ),
    email: z
      .string()
      .email('Invalid email format')
      .max(255, 'Email must be at most 255 characters'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    avatarUrl: z
      .string()
      .url('Avatar URL must be a valid URL')
      .max(500, 'Avatar URL must be at most 500 characters')
      .optional(),
  }),
});

/**
 * Login schema
 */
export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),
});

/**
 * Refresh token schema
 */
export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

/**
 * Update profile schema
 */
export const updateProfileSchema = z.object({
  body: z.object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(50, 'Username must be at most 50 characters')
      .regex(
        /^[a-zA-Z0-9_]+$/,
        'Username can only contain letters, numbers, and underscores'
      )
      .optional(),
    email: z
      .string()
      .email('Invalid email format')
      .max(255, 'Email must be at most 255 characters')
      .optional(),
    avatarUrl: z
      .string()
      .url('Avatar URL must be a valid URL')
      .max(500, 'Avatar URL must be at most 500 characters')
      .nullable()
      .optional(),
  }),
});

/**
 * Change password schema
 */
export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters')
      .regex(/[A-Z]/, 'New password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'New password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'New password must contain at least one number'),
  }),
});

// ============================================
// VALIDATION MIDDLEWARE
// ============================================

/**
 * Generic validation middleware factory
 * Validates request against provided schema
 */
export function validate(schema: z.ZodTypeAny) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.issues.map((err: z.ZodIssue) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors,
        });
      }
      next(error);
    }
  };
}

// ============================================
// EXPORTED VALIDATORS (for convenience)
// ============================================

export const validateRegister = validate(registerSchema);
export const validateLogin = validate(loginSchema);
export const validateRefreshToken = validate(refreshTokenSchema);
export const validateUpdateProfile = validate(updateProfileSchema);
export const validateChangePassword = validate(changePasswordSchema);
