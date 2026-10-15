/**
 * LIBFLOW — Password Reset Token Model
 * 
 * CORE DOMAIN RULE:
 * - Stores cryptographically secure, single-use, expiring password-reset token hashes.
 * - Raw tokens are NEVER stored in plaintext in the database.
 * - Expired or consumed tokens are rejected immediately.
 */

export interface PasswordResetTokenEntity {
  id: string;
  tenantId: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
}

export const mapPasswordResetRow = (row: Record<string, any>): PasswordResetTokenEntity => {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id || 'default-library'),
    userId: String(row.user_id),
    tokenHash: String(row.token_hash),
    expiresAt: new Date(row.expires_at),
    usedAt: row.used_at ? new Date(row.used_at) : null,
    createdAt: new Date(row.created_at),
  };
};
