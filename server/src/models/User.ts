/**
 * LIBFLOW — User Model (Identity, Authentication & Roles)
 * 
 * CORE DOMAIN RULE:
 * - Represents system authentication identity and role permissions (ADMIN, LIBRARIAN, MEMBER).
 * - Member domain profile details are separated into MemberEntity.
 * - Password hashes are NEVER returned in public profiles.
 */

export type UserRole = 'ADMIN' | 'LIBRARIAN' | 'MEMBER';

export interface UserEntity {
  id: string;
  tenantId: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  fullName: string;
  avatarUrl?: string | null;
  isActive: boolean;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type UserSafeProfile = Omit<UserEntity, 'passwordHash'>;

export const sanitizeUser = (user: UserEntity): UserSafeProfile => {
  const { passwordHash: _hash, ...safeUser } = user;
  return safeUser;
};

export const mapUserRow = (row: Record<string, any>): UserEntity => {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id || 'default-library'),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    role: row.role as UserRole,
    fullName: String(row.full_name),
    avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
    isActive: Boolean(row.is_active),
    lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
};
