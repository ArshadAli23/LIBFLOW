/**
 * LIBFLOW — Session Model (Server-Managed Session Persistence)
 * 
 * CORE DOMAIN RULE:
 * - Stores server-managed session records in MySQL.
 * - Identified by a cryptographically secure random token whose SHA-256 hash
 *   is stored in `session_token_hash`.
 * - Enables immediate revocation upon logout, password change, or session timeout.
 */

export interface SessionEntity {
  id: string;
  tenantId: string;
  userId: string;
  sessionTokenHash: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  expiresAt: Date;
  lastActiveAt: Date;
  createdAt: Date;
}

export const mapSessionRow = (row: Record<string, any>): SessionEntity => {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id || 'default-library'),
    userId: String(row.user_id),
    sessionTokenHash: String(row.session_token_hash),
    ipAddress: row.ip_address ? String(row.ip_address) : null,
    userAgent: row.user_agent ? String(row.user_agent) : null,
    expiresAt: new Date(row.expires_at),
    lastActiveAt: new Date(row.last_active_at),
    createdAt: new Date(row.created_at),
  };
};
