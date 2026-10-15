-- ============================================================================
-- LIBFLOW Database Migration: 002_auth_and_sessions.sql
-- Description: Server-Side Sessions, Password Reset Tokens & Seed Credentials
-- Supports: Secure HttpOnly Session Storage, Single-Use Reset Tokens, Audit
-- ============================================================================

-- 1. Server-Side Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(64) NOT NULL,
  tenant_id VARCHAR(64) NOT NULL DEFAULT 'default-library',
  user_id VARCHAR(64) NOT NULL,
  session_token_hash VARCHAR(64) NOT NULL,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(500) NULL,
  expires_at DATETIME NOT NULL,
  last_active_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sessions_token_hash (session_token_hash),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_sessions_user_id (user_id),
  INDEX idx_sessions_expires_at (expires_at),
  INDEX idx_sessions_tenant_user (tenant_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Password Reset Tokens (Single-Use, Expiring, Token Hashes Only)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id VARCHAR(64) NOT NULL,
  tenant_id VARCHAR(64) NOT NULL DEFAULT 'default-library',
  user_id VARCHAR(64) NOT NULL,
  token_hash VARCHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pwd_reset_token_hash (token_hash),
  CONSTRAINT fk_pwd_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_pwd_reset_user_id (user_id),
  INDEX idx_pwd_reset_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Seed Canonical Users (Bcrypt 12 Rounds)
-- Admin: AdminPass123!
INSERT IGNORE INTO users (
  id, tenant_id, email, password_hash, role, full_name, avatar_url, is_active, created_at, updated_at
) VALUES (
  'usr_admin_01',
  'default-library',
  'admin@libflow.io',
  '$2b$12$I783zr5wSDXsYXbg7lov0eSj1AALJYv0Sm37457Gta4UFdSMEXcBO',
  'ADMIN',
  'Dr. Arthur Pendelton',
  NULL,
  TRUE,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

INSERT IGNORE INTO users (
  id, tenant_id, email, password_hash, role, full_name, avatar_url, is_active, created_at, updated_at
) VALUES (
  'usr_admin_demo',
  'default-library',
  'admin@libflow.demo',
  '$2b$12$I783zr5wSDXsYXbg7lov0eSj1AALJYv0Sm37457Gta4UFdSMEXcBO',
  'ADMIN',
  'Dr. Arthur Pendelton',
  NULL,
  TRUE,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Librarian: StaffPass123!
INSERT IGNORE INTO users (
  id, tenant_id, email, password_hash, role, full_name, avatar_url, is_active, created_at, updated_at
) VALUES (
  'usr_librarian_01',
  'default-library',
  'librarian@libflow.io',
  '$2b$12$0wNX.jlq5RlwzMWlyzk7kOG.8nh59TYZXgdCL4KsVAF3G/fmVhdTO',
  'LIBRARIAN',
  'Sarah Thorne',
  NULL,
  TRUE,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

INSERT IGNORE INTO users (
  id, tenant_id, email, password_hash, role, full_name, avatar_url, is_active, created_at, updated_at
) VALUES (
  'usr_librarian_demo',
  'default-library',
  'librarian@libflow.demo',
  '$2b$12$0wNX.jlq5RlwzMWlyzk7kOG.8nh59TYZXgdCL4KsVAF3G/fmVhdTO',
  'LIBRARIAN',
  'Sarah Thorne',
  NULL,
  TRUE,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Member: MemberPass123!
INSERT IGNORE INTO users (
  id, tenant_id, email, password_hash, role, full_name, avatar_url, is_active, created_at, updated_at
) VALUES (
  'usr_member_01',
  'default-library',
  'student@libflow.io',
  '$2b$12$nFGcrQLYju9N3u0VW/SpauH9kUUxN2bQ1/5uaPNrt106aQrxL.z6O',
  'MEMBER',
  'Kavita Sharma',
  NULL,
  TRUE,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

INSERT IGNORE INTO users (
  id, tenant_id, email, password_hash, role, full_name, avatar_url, is_active, created_at, updated_at
) VALUES (
  'usr_member_demo',
  'default-library',
  'member@libflow.demo',
  '$2b$12$nFGcrQLYju9N3u0VW/SpauH9kUUxN2bQ1/5uaPNrt106aQrxL.z6O',
  'MEMBER',
  'Kavita Sharma',
  NULL,
  TRUE,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- 4. Seed Patron Profile for Student Member (Links to users.id)
INSERT IGNORE INTO members (
  id, tenant_id, user_id, member_id, first_name, last_name, full_name, initials,
  email, phone, address, member_type, department, program, academic_year,
  status, membership_start_date, membership_expiry_date, max_borrow_limit,
  active_loans_count, overdue_count, reservation_count, outstanding_fine,
  total_books_borrowed, has_overdue_restrictions, last_activity_at, created_at, updated_at
) VALUES (
  'mem_seed_01',
  'default-library',
  'usr_member_01',
  'MB-2026-081',
  'Kavita',
  'Sharma',
  'Kavita Sharma',
  'KS',
  'student@libflow.io',
  '+1 (555) 345-6789',
  'Campus Dorm Hall 4, Room 204',
  'STUDENT',
  'Department of Computer Science',
  'M.S. Advanced Software Engineering',
  'Year 2',
  'ACTIVE',
  CURRENT_TIMESTAMP,
  DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 365 DAY),
  5,
  3,
  0,
  1,
  0.00,
  14,
  FALSE,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
