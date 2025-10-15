/**
 * TypeScript type extensions for Express
 * Adds custom properties to Express Request object
 */

declare namespace Express {
  /**
   * Extended Request interface with authentication data
   */
  export interface Request {
    /**
     * Authenticated user information from JWT token
     * Available after authentication middleware runs
     */
    user?: {
      userId: string;
      email: string;
      role: 'USER' | 'ADMIN';
    };

    /**
     * Raw JWT token from Authorization header
     */
    token?: string;
  }
}
