/**
 * LIBFLOW — BookCopy Model (Physical Asset)
 * 
 * CORE DOMAIN RULE:
 * - A BookCopy represents an individual, physical copy of a bibliographic Book.
 * - Each copy holds its own unique barcode (e.g. "LC-00421"), shelf position,
 *   physical wear condition rating, and circulation state.
 * - Books and BookCopies MUST remain strictly separate.
 */

export type CopyStatus =
  | 'AVAILABLE'
  | 'BORROWED'
  | 'RESERVED'
  | 'MAINTENANCE'
  | 'LOST'
  | 'DAMAGED'
  | 'WITHDRAWN';

export type CopyCondition =
  | 'NEW'
  | 'EXCELLENT'
  | 'GOOD'
  | 'FAIR'
  | 'POOR'
  | 'DAMAGED';

export type CopyLifecycleEventType =
  | 'ACQUIRED'
  | 'AVAILABLE'
  | 'BORROWED'
  | 'RETURNED'
  | 'RESERVED'
  | 'MAINTENANCE'
  | 'WITHDRAWN';

export interface BookCopyEventEntity {
  id: string;
  tenantId: string;
  copyId: string;
  event: CopyLifecycleEventType;
  actor: string;
  note?: string | null;
  createdAt: Date;
}

export interface BookCopyEntity {
  id: string;
  tenantId: string;
  bookId: string;
  copyNumber: number;
  copyCode?: string | null;
  barcode: string;
  shelf: string;
  location: string;
  conditionRating: CopyCondition;
  status: CopyStatus;
  acquisitionDate: Date;
  acquisitionCost?: number | null;
  currentHolderId?: string | null;
  currentHolderName?: string | null;
  borrowedDate?: Date | null;
  dueDate?: Date | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const mapBookCopyRow = (row: Record<string, any>): BookCopyEntity => {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id || 'default-library'),
    bookId: String(row.book_id),
    copyNumber: Number(row.copy_number),
    copyCode: row.copy_code ? String(row.copy_code) : null,
    barcode: String(row.barcode),
    shelf: String(row.shelf),
    location: String(row.location || 'Central University Library'),
    conditionRating: (row.condition_rating || 'GOOD') as CopyCondition,
    status: (row.status || 'AVAILABLE') as CopyStatus,
    acquisitionDate: new Date(row.acquisition_date),
    acquisitionCost: row.acquisition_cost !== null && row.acquisition_cost !== undefined ? Number(row.acquisition_cost) : null,
    currentHolderId: row.current_holder_id ? String(row.current_holder_id) : null,
    currentHolderName: row.current_holder_name ? String(row.current_holder_name) : null,
    borrowedDate: row.borrowed_date ? new Date(row.borrowed_date) : null,
    dueDate: row.due_date ? new Date(row.due_date) : null,
    notes: row.notes ? String(row.notes) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
};

export const mapBookCopyEventRow = (row: Record<string, any>): BookCopyEventEntity => {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id || 'default-library'),
    copyId: String(row.copy_id),
    event: row.event as CopyLifecycleEventType,
    actor: String(row.actor),
    note: row.note ? String(row.note) : null,
    createdAt: new Date(row.created_at),
  };
};
