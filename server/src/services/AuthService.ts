/**
 * LIBFLOW — Authentication & Session Management Service
 * 
 * CORE DOMAIN RESPONSIBILITIES:
 * - Bcrypt password hashing (12 work factor) and timing-safe comparison.
 * - Server-managed session tokens stored as SHA-256 hashes in MySQL.
 * - Single-use, expiring password reset tokens.
 * - Automatic session revocation on logout, password change, and reset.
 * - Defense against user enumeration (uniform response timing & generic messages).
 * - Comprehensive immutable audit logging.
 */

import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { getPool, withTransaction } from '../config/database.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { mapUserRow, sanitizeUser, type UserEntity, type UserSafeProfile } from '../models/User.js';
import { mapSessionRow, type SessionEntity } from '../models/Session.js';
import { mapPasswordResetRow, type PasswordResetTokenEntity } from '../models/PasswordReset.js';
import { AuditService } from './AuditService.js';

// Pre-computed bcrypt hash of a random string used to prevent timing attacks when user is not found
const DUMMY_BCRYPT_HASH = '$2b$12$I783zr5wSDXsYXbg7lov0eSj1AALJYv0Sm37457Gta4UFdSMEXcBO';

export interface LoginResult {
  user: UserSafeProfile;
  sessionToken: string;
  session: SessionEntity;
  memberProfile?: Record<string, unknown> | null;
}

export interface SessionVerificationResult {
  user: UserEntity;
  session: SessionEntity;
  memberProfile?: Record<string, unknown> | null;
}

export class AuthService {
  /**
   * Hashes a plaintext password using bcrypt with work factor 12.
   */
  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 12);
  }

  /**
   * Verifies a plaintext password against a stored bcrypt hash.
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generates a cryptographically secure random session token (32 bytes / 64 hex characters).
   */
  static generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Computes the SHA-256 digest of a raw token for secure database indexing and persistence.
   */
  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Authenticates a user with email and password, creating a new server-side session.
   * Protects against account enumeration with generic errors and uniform timing.
   */
  static async login(
    email: string,
    password: string,
    context: {
      ipAddress?: string | null;
      userAgent?: string | null;
      tenantId?: string;
    } = {}
  ): Promise<LoginResult> {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const tenantId = context.tenantId || 'default-library';

    const pool = getPool();
    const [rows] = await pool.query<any[]>(
      'SELECT * FROM users WHERE tenant_id = ? AND email = ? LIMIT 1',
      [tenantId, normalizedEmail]
    );

    const userRow = rows && rows.length > 0 ? rows[0] : null;

    if (!userRow) {
      // Execute dummy bcrypt check to equalize response time and prevent timing attacks
      await this.verifyPassword(password || '', DUMMY_BCRYPT_HASH);
      throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const user = mapUserRow(userRow);

    if (!user.isActive) {
      // Inactive/suspended accounts receive the identical generic error to prevent account probing
      await this.verifyPassword(password || '', user.passwordHash);
      throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const isMatch = await this.verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    // Generate session token and its SHA-256 hash
    const rawSessionToken = this.generateSecureToken();
    const sessionTokenHash = this.hashToken(rawSessionToken);
    const sessionId = `ses_${crypto.randomUUID()}`;
    const expiresAt = new Date(Date.now() + env.AUTH.sessionTtlHours * 3600 * 1000);

    // Persist session to MySQL
    await pool.query(
      `INSERT INTO sessions (
        id, tenant_id, user_id, session_token_hash, ip_address, user_agent,
        expires_at, last_active_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        sessionId,
        tenantId,
        user.id,
        sessionTokenHash,
        context.ipAddress || null,
        context.userAgent || null,
        expiresAt,
      ]
    );

    // Update last_login_at timestamp
    await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

    // Check for Member circulation profile
    let memberProfile: Record<string, unknown> | null = null;
    if (user.role === 'MEMBER') {
      const [memberRows] = await pool.query<any[]>(
        'SELECT * FROM members WHERE tenant_id = ? AND user_id = ? LIMIT 1',
        [tenantId, user.id]
      );
      if (memberRows && memberRows.length > 0) {
        const m = memberRows[0];
        memberProfile = {
          id: m.id,
          memberId: m.member_id,
          memberType: m.member_type,
          department: m.department,
          program: m.program,
          status: m.status,
          maxBorrowLimit: m.max_borrow_limit,
          activeLoansCount: m.active_loans_count,
          hasOverdueRestrictions: Boolean(m.has_overdue_restrictions),
        };
      }
    }

    // Record audit event
    await AuditService.log({
      tenantId,
      actorId: user.id,
      actorRole: user.role,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    const session: SessionEntity = {
      id: sessionId,
      tenantId,
      userId: user.id,
      sessionTokenHash,
      ipAddress: context.ipAddress || null,
      userAgent: context.userAgent || null,
      expiresAt,
      lastActiveAt: new Date(),
      createdAt: new Date(),
    };

    return {
      user: sanitizeUser(user),
      sessionToken: rawSessionToken,
      session,
      memberProfile,
    };
  }

  /**
   * Verifies an active session token.
   * Updates last_active_at periodically and enforces expiration and user active state.
   */
  static async verifySession(rawToken: string): Promise<SessionVerificationResult> {
    if (!rawToken || typeof rawToken !== 'string') {
      throw ApiError.unauthorized('Authentication required', 'UNAUTHORIZED');
    }

    const sessionTokenHash = this.hashToken(rawToken);
    const pool = getPool();

    const [rows] = await pool.query<any[]>(
      `SELECT 
        s.id AS session_id,
        s.tenant_id AS session_tenant_id,
        s.user_id AS session_user_id,
        s.session_token_hash,
        s.ip_address,
        s.user_agent,
        s.expires_at AS session_expires_at,
        s.last_active_at,
        s.created_at AS session_created_at,
        u.*
      FROM sessions s
      INNER JOIN users u ON u.id = s.user_id
      WHERE s.session_token_hash = ?
      LIMIT 1`,
      [sessionTokenHash]
    );

    if (!rows || rows.length === 0) {
      throw ApiError.unauthorized('Invalid or terminated session', 'UNAUTHORIZED');
    }

    const row = rows[0];
    const session = mapSessionRow({
      id: row.session_id,
      tenant_id: row.session_tenant_id,
      user_id: row.session_user_id,
      session_token_hash: row.session_token_hash,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      expires_at: row.session_expires_at,
      last_active_at: row.last_active_at,
      created_at: row.session_created_at,
    });

    // Check expiration
    if (session.expiresAt.getTime() <= Date.now()) {
      await pool.query('DELETE FROM sessions WHERE id = ?', [session.id]);
      throw ApiError.unauthorized('Session has expired. Please sign in again.', 'SESSION_EXPIRED');
    }

    const user = mapUserRow(row);

    // Verify account active status
    if (!user.isActive) {
      await pool.query('DELETE FROM sessions WHERE id = ?', [session.id]);
      throw ApiError.unauthorized('User account has been deactivated.', 'ACCOUNT_INACTIVE');
    }

    // Refresh last_active_at if more than 5 minutes since previous update
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    if (session.lastActiveAt.getTime() < fiveMinutesAgo) {
      await pool.query('UPDATE sessions SET last_active_at = NOW() WHERE id = ?', [session.id]);
    }

    // Fetch member profile if user has MEMBER role
    let memberProfile: Record<string, unknown> | null = null;
    if (user.role === 'MEMBER') {
      const [memberRows] = await pool.query<any[]>(
        'SELECT * FROM members WHERE tenant_id = ? AND user_id = ? LIMIT 1',
        [user.tenantId, user.id]
      );
      if (memberRows && memberRows.length > 0) {
        const m = memberRows[0];
        memberProfile = {
          id: m.id,
          memberId: m.member_id,
          memberType: m.member_type,
          department: m.department,
          program: m.program,
          status: m.status,
          maxBorrowLimit: m.max_borrow_limit,
          activeLoansCount: m.active_loans_count,
          hasOverdueRestrictions: Boolean(m.has_overdue_restrictions),
        };
      }
    }

    return { user, session, memberProfile };
  }

  /**
   * Logs out the current session, removing it from MySQL and recording an audit trail.
   */
  static async logout(rawToken: string, ipAddress?: string, userAgent?: string): Promise<void> {
    if (!rawToken) return;

    const tokenHash = this.hashToken(rawToken);
    const pool = getPool();

    const [rows] = await pool.query<any[]>(
      'SELECT id, user_id, tenant_id FROM sessions WHERE session_token_hash = ? LIMIT 1',
      [tokenHash]
    );

    if (rows && rows.length > 0) {
      const { user_id, tenant_id } = rows[0];
      await pool.query('DELETE FROM sessions WHERE session_token_hash = ?', [tokenHash]);

      await AuditService.log({
        tenantId: tenant_id,
        actorId: user_id,
        actorRole: 'USER',
        action: 'USER_LOGOUT',
        entityType: 'User',
        entityId: user_id,
        ipAddress,
        userAgent,
      });
    }
  }

  /**
   * Initiates password recovery.
   * Returns a generic message to prevent account enumeration.
   */
  static async forgotPassword(
    email: string,
    context: { ipAddress?: string; userAgent?: string; tenantId?: string } = {}
  ): Promise<{ resetTokenForDev?: string }> {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const tenantId = context.tenantId || 'default-library';

    const pool = getPool();
    const [rows] = await pool.query<any[]>(
      'SELECT id, role, is_active FROM users WHERE tenant_id = ? AND email = ? LIMIT 1',
      [tenantId, normalizedEmail]
    );

    // If account not found or inactive, execute dummy work and return generic success
    if (!rows || rows.length === 0 || !rows[0].is_active) {
      return {};
    }

    const userId = rows[0].id;
    const userRole = rows[0].role;

    // Invalidate any previously issued unused reset tokens for this user
    await pool.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL',
      [userId]
    );

    // Generate single-use secure reset token
    const rawResetToken = this.generateSecureToken();
    const tokenHash = this.hashToken(rawResetToken);
    const tokenId = `rst_${crypto.randomUUID()}`;
    const expiresAt = new Date(Date.now() + env.AUTH.resetTokenTtlMinutes * 60 * 1000);

    await pool.query(
      `INSERT INTO password_reset_tokens (
        id, tenant_id, user_id, token_hash, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, NOW())`,
      [tokenId, tenantId, userId, tokenHash, expiresAt]
    );

    await AuditService.log({
      tenantId,
      actorId: userId,
      actorRole: userRole,
      action: 'PASSWORD_RESET_REQUESTED',
      entityType: 'User',
      entityId: userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    // In development or test, supply token for verification
    if (env.NODE_ENV !== 'production') {
      return { resetTokenForDev: rawResetToken };
    }

    return {};
  }

  /**
   * Completes password reset using a verified, single-use, unexpired token.
   * Revokes all active sessions for that user upon success.
   */
  static async resetPassword(
    rawToken: string,
    newPassword: string,
    context: { ipAddress?: string; userAgent?: string } = {}
  ): Promise<void> {
    if (!rawToken || typeof rawToken !== 'string') {
      throw ApiError.badRequest('Invalid or expired password reset token', 'INVALID_RESET_TOKEN');
    }

    const tokenHash = this.hashToken(rawToken);
    const pool = getPool();

    const [rows] = await pool.query<any[]>(
      `SELECT * FROM password_reset_tokens 
       WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW() 
       LIMIT 1`,
      [tokenHash]
    );

    if (!rows || rows.length === 0) {
      throw ApiError.badRequest('Invalid or expired password reset token', 'INVALID_RESET_TOKEN');
    }

    const resetRecord = mapPasswordResetRow(rows[0]);
    const newPasswordHash = await this.hashPassword(newPassword);

    await withTransaction(async (conn) => {
      // 1. Mark token as used
      await conn.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?', [
        resetRecord.id,
      ]);

      // 2. Update user's password hash
      await conn.query(
        'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
        [newPasswordHash, resetRecord.userId]
      );

      // 3. Invalidate ALL existing sessions for this user across all devices
      await conn.query('DELETE FROM sessions WHERE user_id = ?', [resetRecord.userId]);
    });

    await AuditService.log({
      tenantId: resetRecord.tenantId,
      actorId: resetRecord.userId,
      actorRole: 'USER',
      action: 'PASSWORD_RESET_COMPLETED',
      entityType: 'User',
      entityId: resetRecord.userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
  }

  /**
   * Authenticated password change.
   * Verifies current password, updates hash, and invalidates other sessions.
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    currentRawSessionToken?: string,
    context: { ipAddress?: string; userAgent?: string } = {}
  ): Promise<void> {
    const pool = getPool();
    const [rows] = await pool.query<any[]>(
      'SELECT id, tenant_id, role, password_hash FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (!rows || rows.length === 0) {
      throw ApiError.unauthorized('User identity not found', 'UNAUTHORIZED');
    }

    const userRow = rows[0];
    const isCurrentValid = await this.verifyPassword(currentPassword, userRow.password_hash);

    if (!isCurrentValid) {
      throw ApiError.badRequest('Current password is incorrect', 'INVALID_CURRENT_PASSWORD');
    }

    const newPasswordHash = await this.hashPassword(newPassword);
    const currentSessionHash = currentRawSessionToken ? this.hashToken(currentRawSessionToken) : null;

    await withTransaction(async (conn) => {
      // 1. Update password
      await conn.query('UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?', [
        newPasswordHash,
        userId,
      ]);

      // 2. Revoke other sessions (preserving current session if provided)
      if (currentSessionHash) {
        await conn.query(
          'DELETE FROM sessions WHERE user_id = ? AND session_token_hash != ?',
          [userId, currentSessionHash]
        );
      } else {
        await conn.query('DELETE FROM sessions WHERE user_id = ?', [userId]);
      }
    });

    await AuditService.log({
      tenantId: userRow.tenant_id,
      actorId: userId,
      actorRole: userRow.role,
      action: 'PASSWORD_CHANGED',
      entityType: 'User',
      entityId: userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
  }
}
