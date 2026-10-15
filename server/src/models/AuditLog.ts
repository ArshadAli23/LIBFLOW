/**
 * LIBFLOW — AuditLog Model (Append-Only Event Ledger)
 * 
 * CORE DOMAIN RULE:
 * - Records all sensitive administrative, financial, and circulation mutations.
 * - Append-only semantics: records are immutable once inserted.
 */

import { parseJsonField } from './Book.js';

export type AuditEntityType =
  | 'Book'
  | 'BookCopy'
  | 'Loan'
  | 'BorrowTransaction'
  | 'Reservation'
  | 'Fine'
  | 'Member'
  | 'User'
  | 'Settings'
  | 'System';

export interface AuditLogEntity {
  id: string;
  tenantId: string;
  actorId: string;
  actorRole: string;
  action: string;
  entityType: AuditEntityType;
  entityId: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  timestamp: Date;
  createdAt: Date;
}

export const mapAuditLogRow = (row: Record<string, any>): AuditLogEntity => {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id || 'default-library'),
    actorId: String(row.actor_id),
    actorRole: String(row.actor_role || 'SYSTEM'),
    action: String(row.action),
    entityType: row.entity_type as AuditEntityType,
    entityId: String(row.entity_id),
    oldValue: parseJsonField<Record<string, unknown> | null>(row.old_value, null),
    newValue: parseJsonField<Record<string, unknown> | null>(row.new_value, null),
    ipAddress: row.ip_address ? String(row.ip_address) : null,
    userAgent: row.user_agent ? String(row.user_agent) : null,
    timestamp: new Date(row.timestamp),
    createdAt: new Date(row.created_at),
  };
};
