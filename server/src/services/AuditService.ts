/**
 * LIBFLOW — Enterprise Audit Service
 * 
 * CORE DOMAIN RULE:
 * - Appends immutable compliance logs to the `audit_logs` table.
 * - Captures actor, role, action, entity, IP address, and payload diffs.
 * - STRICTLY REDACTS all sensitive credentials, passwords, and tokens.
 */

import crypto from 'node:crypto';
import { getPool } from '../config/database.js';
import type { AuditEntityType } from '../models/AuditLog.js';

export interface AuditLogInput {
  tenantId?: string;
  actorId: string;
  actorRole: string;
  action: string;
  entityType: AuditEntityType;
  entityId: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class AuditService {
  /**
   * Redacts sensitive keys before storing JSON diffs.
   */
  private static sanitizePayload(data?: Record<string, unknown> | null): Record<string, unknown> | null {
    if (!data || typeof data !== 'object') return null;
    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = new Set([
      'password',
      'passwordhash',
      'password_hash',
      'currentpassword',
      'newpassword',
      'token',
      'tokenhash',
      'token_hash',
      'sessiontoken',
      'session_token',
      'secret',
    ]);

    for (const [key, value] of Object.entries(data)) {
      if (sensitiveKeys.has(key.toLowerCase().replace(/[-_]/g, ''))) {
        sanitized[key] = '[REDACTED]';
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = this.sanitizePayload(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Appends an audit entry. Never throws operational failure to caller.
   */
  static async log(input: AuditLogInput): Promise<void> {
    try {
      const id = `aud_${crypto.randomUUID()}`;
      const tenantId = input.tenantId || 'default-library';
      const oldValueJson = input.oldValue ? JSON.stringify(this.sanitizePayload(input.oldValue)) : null;
      const newValueJson = input.newValue ? JSON.stringify(this.sanitizePayload(input.newValue)) : null;

      const pool = getPool();
      await pool.query(
        `INSERT INTO audit_logs (
          id, tenant_id, actor_id, actor_role, action, entity_type, entity_id,
          old_value, new_value, ip_address, user_agent, timestamp, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          id,
          tenantId,
          input.actorId,
          input.actorRole,
          input.action,
          input.entityType,
          input.entityId,
          oldValueJson,
          newValueJson,
          input.ipAddress || null,
          input.userAgent || null,
        ]
      );
    } catch (err: unknown) {
      // Degraded / offline database fallback: do not crash user flow, log warning safely
      console.warn(`[AuditService WARNING] Could not write audit log entry: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
