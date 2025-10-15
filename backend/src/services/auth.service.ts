/**
 * Authentication Service
 * Business logic for user authentication and authorization
 */

import { prisma } from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateTokenPair, generateAccessToken, JWTPayload } from '../utils/jwt';
import { Prisma } from '@prisma/client';

// ============================================
// TYPES
// ============================================

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  avatarUrl?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    username: string;
    email: string;
    role: 'USER' | 'ADMIN';
    avatarUrl: string | null;
    createdAt: Date;
  };
  accessToken: string;
  refreshToken: string;
}

// ============================================
// AUTHENTICATION SERVICE
// ============================================

export class AuthService {
  /**
   * Register a new user
   * - Validates unique email and username
   * - Hashes password with bcrypt (≥12 rounds)
   * - Creates user in database
   * - Generates JWT tokens
   */
  async register(input: RegisterInput): Promise<AuthResponse> {
    const { username, email, password, avatarUrl } = input;

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      throw new Error('Email already registered');
    }

    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });
    if (existingUsername) {
      throw new Error('Username already taken');
    }

    // Hash password with bcrypt (≥12 rounds as per requirement)
    const passwordHash = await hashPassword(password);

    // Create user in database
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        avatarUrl: avatarUrl || null,
        role: 'USER', // Default role
      },
    });

    // Generate JWT tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Login existing user
   * - Validates credentials
   * - Verifies password with bcrypt
   * - Generates new JWT tokens
   */
  async login(input: LoginInput): Promise<AuthResponse> {
    const { email, password } = input;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Refresh access token using refresh token
   * - Validates refresh token
   * - Generates new access token
   * - Optionally rotates refresh token for security
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken?: string;
  }> {
    // Find refresh token in database
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new Error('Invalid refresh token');
    }

    // Check if token is expired
    if (tokenRecord.expiresAt < new Date()) {
      // Delete expired token
      await prisma.refreshToken.delete({
        where: { token: refreshToken },
      });
      throw new Error('Refresh token expired');
    }

    // Generate new access token
    const accessToken = generateAccessToken({
      userId: tokenRecord.user.id,
      email: tokenRecord.user.email,
      role: tokenRecord.user.role,
    });

    // Optional: Implement refresh token rotation for security
    // Delete old refresh token and create new one
    // This is a security best practice to prevent token reuse

    return {
      accessToken,
    };
  }

  /**
   * Logout user
   * - Invalidates refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    try {
      await prisma.refreshToken.delete({
        where: { token: refreshToken },
      });
    } catch (error) {
      // Token might not exist, which is fine
      // User is effectively logged out either way
    }
  }

  /**
   * Logout from all devices
   * - Deletes all refresh tokens for user
   */
  async logoutAllDevices(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updates: {
      username?: string;
      email?: string;
      avatarUrl?: string | null;
    }
  ) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: updates,
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return user;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2002: Unique constraint violation
        if (error.code === 'P2002') {
          const field = (error.meta?.target as string[])?.[0];
          throw new Error(`${field} already taken`);
        }
      }
      throw error;
    }
  }

  /**
   * Change password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValidPassword = await comparePassword(
      currentPassword,
      user.passwordHash
    );
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    // Logout from all devices for security
    await this.logoutAllDevices(userId);
  }

  /**
   * Clean up expired refresh tokens (for maintenance)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }
}

// Export singleton instance
export const authService = new AuthService();
