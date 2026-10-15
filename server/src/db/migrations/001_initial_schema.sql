-- ============================================================================
-- LIBFLOW Database Migration: 001_initial_schema.sql
-- Description: Core Relational Schema for MySQL 8+
-- Supports: Tenant Isolation, Strict Foreign Keys, Indexes, Fulltext Search
-- ============================================================================

-- 0. Schema Version Tracker
CREATE TABLE IF NOT EXISTS schema_migrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  version VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_schema_migrations_version (version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1. Users (Identity, Credentials, Role-Based Access Control)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) NOT NULL,
  tenant_id VARCHAR(64) NOT NULL DEFAULT 'default-library',
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('ADMIN', 'LIBRARIAN', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
  full_name VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(1024) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_tenant_email (tenant_id, email),
  INDEX idx_users_tenant_role (tenant_id, role),
  INDEX idx_users_tenant_status (tenant_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Books (Abstract Bibliographic Master Catalog)
CREATE TABLE IF NOT EXISTS books (
  id VARCHAR(64) NOT NULL,
  tenant_id VARCHAR(64) NOT NULL DEFAULT 'default-library',
  isbn VARCHAR(32) NOT NULL,
  title VARCHAR(500) NOT NULL,
  subtitle VARCHAR(500) NULL,
  authors JSON NOT NULL,
  publisher VARCHAR(255) NOT NULL,
  publication_year INT NOT NULL,
  edition VARCHAR(100) NULL,
  language VARCHAR(100) NOT NULL DEFAULT 'English',
  category VARCHAR(150) NOT NULL,
  subcategory VARCHAR(150) NULL,
  tags JSON NOT NULL,
  description TEXT NOT NULL,
  cover_url VARCHAR(1024) NULL,
  format ENUM('HARDCOVER', 'PAPERBACK', 'DIGITAL', 'PERIODICAL') NOT NULL DEFAULT 'PAPERBACK',
  subject VARCHAR(255) NULL,
  call_number VARCHAR(100) NULL,
  dewey_decimal VARCHAR(50) NULL,
  total_copies INT NOT NULL DEFAULT 0,
  available_copies INT NOT NULL DEFAULT 0,
  borrowed_copies INT NOT NULL DEFAULT 0,
  reserved_copies INT NOT NULL DEFAULT 0,
  times_borrowed INT NOT NULL DEFAULT 0,
  status ENUM('ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_books_tenant_isbn (tenant_id, isbn),
  INDEX idx_books_tenant_category (tenant_id, category),
  INDEX idx_books_tenant_status (tenant_id, status),
  INDEX idx_books_tenant_pub_year (tenant_id, publication_year),
  FULLTEXT KEY ft_books_search (title, description, publisher)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Book Copies (Serialized Physical Inventory & Shelf Tracking)
CREATE TABLE IF NOT EXISTS book_copies (
  id VARCHAR(64) NOT NULL,
  tenant_id VARCHAR(64) NOT NULL DEFAULT 'default-library',
  book_id VARCHAR(64) NOT NULL,
  copy_number INT NOT NULL,
  copy_code VARCHAR(64) NULL,
  barcode VARCHAR(64) NOT NULL,
  shelf VARCHAR(100) NOT NULL,
  location VARCHAR(255) NOT NULL DEFAULT 'Central University Library',
  condition_rating ENUM('NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED') NOT NULL DEFAULT 'GOOD',
  status ENUM('AVAILABLE', 'BORROWED', 'RESERVED', 'MAINTENANCE', 'LOST', 'DAMAGED', 'WITHDRAWN') NOT NULL DEFAULT 'AVAILABLE',
  acquisition_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  acquisition_cost DECIMAL(10, 2) NULL,
  current_holder_id VARCHAR(64) NULL,
  current_holder_name VARCHAR(255) NULL,
  borrowed_date DATETIME NULL,
  due_date DATETIME NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_book_copies_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  UNIQUE KEY uq_book_copies_tenant_barcode (tenant_id, barcode),
  UNIQUE KEY uq_book_copies_tenant_book_copy (tenant_id, book_id, copy_number),
  INDEX idx_book_copies_tenant_status (tenant_id, status),
  INDEX idx_book_copies_tenant_shelf (tenant_id, shelf),
  INDEX idx_book_copies_book_id (book_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3b. Book Copy Events (Audit Timeline of Physical Copy Transitions)
CREATE TABLE IF NOT EXISTS book_copy_events (
  id VARCHAR(64) NOT NULL,
  tenant_id VARCHAR(64) NOT NULL DEFAULT 'default-library',
  copy_id VARCHAR(64) NOT NULL,
  event ENUM('ACQUIRED', 'AVAILABLE', 'BORROWED', 'RETURNED', 'RESERVED', 'MAINTENANCE', 'WITHDRAWN') NOT NULL,
  actor VARCHAR(255) NOT NULL,
  note VARCHAR(1000) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_copy_events_copy FOREIGN KEY (copy_id) REFERENCES book_copies(id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_copy_events_copy_id (copy_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Members (Patron Circulation Profiles — Never Stores Passwords)
CREATE TABLE IF NOT EXISTS members (
  id VARCHAR(64) NOT NULL,
  tenant_id VARCHAR(64) NOT NULL DEFAULT 'default-library',
  user_id VARCHAR(64) NULL,
  member_id VARCHAR(64) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  initials VARCHAR(10) NOT NULL,
  avatar_url VARCHAR(1024) NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  address VARCHAR(500) NOT NULL DEFAULT '',
  member_type ENUM('STUDENT', 'FACULTY', 'STAFF', 'RESEARCHER', 'EXTERNAL', 'GENERAL') NOT NULL DEFAULT 'STUDENT',
  department VARCHAR(150) NOT NULL,
  program VARCHAR(150) NOT NULL DEFAULT '',
  academic_year VARCHAR(50) NOT NULL DEFAULT '',
  status ENUM('ACTIVE', 'SUSPENDED', 'EXPIRED', 'PENDING') NOT NULL DEFAULT 'ACTIVE',
  status_reason VARCHAR(500) NULL,
  registration_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  membership_start_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  membership_expiry_date DATETIME NOT NULL,
  max_borrow_limit INT NOT NULL DEFAULT 5,
  active_loans_count INT NOT NULL DEFAULT 0,
  overdue_count INT NOT NULL DEFAULT 0,
  reservation_count INT NOT NULL DEFAULT 0,
  outstanding_fine DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  total_books_borrowed INT NOT NULL DEFAULT 0,
  has_overdue_restrictions BOOLEAN NOT NULL DEFAULT FALSE,
  last_activity_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  UNIQUE KEY uq_members_tenant_member_id (tenant_id, member_id),
  UNIQUE KEY uq_members_tenant_email (tenant_id, email),
  INDEX idx_members_tenant_status (tenant_id, status),
  INDEX idx_members_tenant_type (tenant_id, member_type),
  INDEX idx_members_tenant_dept (tenant_id, department),
  INDEX idx_members_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Loans (Circulation Transaction Contract)
CREATE TABLE IF NOT EXISTS loans (
  id VARCHAR(64) NOT NULL,
  tenant_id VARCHAR(64) NOT NULL DEFAULT 'default-library',
  loan_number VARCHAR(64) NOT NULL,
  member_id VARCHAR(64) NOT NULL,
  member_barcode VARCHAR(64) NULL,
  member_name VARCHAR(255) NULL,
  member_email VARCHAR(255) NULL,
  book_id VARCHAR(64) NOT NULL,
  book_title VARCHAR(500) NULL,
  book_copy_id VARCHAR(64) NOT NULL,
  copy_barcode VARCHAR(64) NOT NULL,
  copy_shelf VARCHAR(100) NULL,
  checkout_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_date DATETIME NOT NULL,
  return_date DATETIME NULL,
  status ENUM('ACTIVE', 'OVERDUE', 'RETURNED', 'LOST', 'DAMAGED') NOT NULL DEFAULT 'ACTIVE',
  renewal_count INT NOT NULL DEFAULT 0,
  max_renewals INT NOT NULL DEFAULT 2,
  issued_by VARCHAR(255) NOT NULL DEFAULT 'SYSTEM',
  returned_to VARCHAR(255) NULL,
  fine_calculated DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_loans_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_loans_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_loans_book_copy FOREIGN KEY (book_copy_id) REFERENCES book_copies(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  UNIQUE KEY uq_loans_tenant_loan_number (tenant_id, loan_number),
  INDEX idx_loans_tenant_member_status (tenant_id, member_id, status),
  INDEX idx_loans_tenant_copy_status (tenant_id, book_copy_id, status),
  INDEX idx_loans_tenant_due_status (tenant_id, due_date, status),
  INDEX idx_loans_tenant_status (tenant_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Reservations (First-In-First-Out Hold Queue & Pickup Windows)
CREATE TABLE IF NOT EXISTS reservations (
  id VARCHAR(64) NOT NULL,
  tenant_id VARCHAR(64) NOT NULL DEFAULT 'default-library',
  reservation_number VARCHAR(64) NOT NULL,
  member_id VARCHAR(64) NOT NULL,
  member_barcode VARCHAR(64) NULL,
  member_name VARCHAR(255) NULL,
  member_email VARCHAR(255) NULL,
  book_id VARCHAR(64) NOT NULL,
  book_title VARCHAR(500) NULL,
  assigned_copy_id VARCHAR(64) NULL,
  status ENUM('WAITING', 'READY_FOR_PICKUP', 'CLAIMED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'WAITING',
  queue_position INT NOT NULL DEFAULT 1,
  ready_at DATETIME NULL,
  expires_at DATETIME NULL,
  claimed_at DATETIME NULL,
  cancelled_at DATETIME NULL,
  pickup_slot VARCHAR(100) NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_reservations_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_reservations_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_reservations_assigned_copy FOREIGN KEY (assigned_copy_id) REFERENCES book_copies(id) ON DELETE SET NULL ON UPDATE CASCADE,
  UNIQUE KEY uq_reservations_tenant_res_number (tenant_id, reservation_number),
  INDEX idx_reservations_tenant_book_queue (tenant_id, book_id, status, queue_position),
  INDEX idx_reservations_tenant_member_status (tenant_id, member_id, status),
  INDEX idx_reservations_tenant_expires_status (tenant_id, expires_at, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Fines (Financial Liabilities Ledger)
CREATE TABLE IF NOT EXISTS fines (
  id VARCHAR(64) NOT NULL,
  tenant_id VARCHAR(64) NOT NULL DEFAULT 'default-library',
  fine_number VARCHAR(64) NOT NULL,
  member_id VARCHAR(64) NOT NULL,
  member_barcode VARCHAR(64) NULL,
  member_name VARCHAR(255) NULL,
  member_email VARCHAR(255) NULL,
  loan_id VARCHAR(64) NULL,
  loan_number VARCHAR(64) NULL,
  book_id VARCHAR(64) NULL,
  book_title VARCHAR(500) NULL,
  book_copy_id VARCHAR(64) NULL,
  copy_barcode VARCHAR(64) NULL,
  reason ENUM('OVERDUE', 'DAMAGED_ITEM', 'LOST_ITEM', 'PROCESSING_FEE') NOT NULL DEFAULT 'OVERDUE',
  status ENUM('UNPAID', 'PARTIALLY_PAID', 'PAID', 'WAIVED') NOT NULL DEFAULT 'UNPAID',
  original_amount DECIMAL(10, 2) NOT NULL,
  amount_paid DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  waived_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  balance DECIMAL(10, 2) NOT NULL,
  days_overdue INT NOT NULL DEFAULT 0,
  fine_per_day DECIMAL(10, 2) NOT NULL DEFAULT 5.00,
  grace_period_days INT NOT NULL DEFAULT 2,
  max_fine_cap DECIMAL(10, 2) NOT NULL DEFAULT 100.00,
  due_date DATETIME NULL,
  return_date DATETIME NULL,
  issued_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_fines_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_fines_loan FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_fines_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_fines_book_copy FOREIGN KEY (book_copy_id) REFERENCES book_copies(id) ON DELETE SET NULL ON UPDATE CASCADE,
  UNIQUE KEY uq_fines_tenant_fine_number (tenant_id, fine_number),
  INDEX idx_fines_tenant_member_status (tenant_id, member_id, status),
  INDEX idx_fines_tenant_loan (tenant_id, loan_id),
  INDEX idx_fines_tenant_status (tenant_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7a. Fine Payments (Individual Collected Payments Breakdown)
CREATE TABLE IF NOT EXISTS fine_payments (
  id VARCHAR(64) NOT NULL,
  tenant_id VARCHAR(64) NOT NULL DEFAULT 'default-library',
  fine_id VARCHAR(64) NOT NULL,
  payment_number VARCHAR(64) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  method ENUM('CASH', 'CAMPUS_CARD', 'UPI_ONLINE', 'CARD', 'ONLINE', 'WAIVER') NOT NULL,
  transaction_reference VARCHAR(255) NULL,
  collected_by VARCHAR(255) NOT NULL,
  paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_fine_payments_fine FOREIGN KEY (fine_id) REFERENCES fines(id) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY uq_fine_payments_number (tenant_id, payment_number),
  INDEX idx_fine_payments_fine_id (fine_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7b. Fine Waivers (Audited Administrative Relief Entries)
CREATE TABLE IF NOT EXISTS fine_waivers (
  id VARCHAR(64) NOT NULL,
  tenant_id VARCHAR(64) NOT NULL DEFAULT 'default-library',
  fine_id VARCHAR(64) NOT NULL,
  waiver_number VARCHAR(64) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  reason VARCHAR(500) NOT NULL,
  waived_by VARCHAR(255) NOT NULL,
  waived_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_fine_waivers_fine FOREIGN KEY (fine_id) REFERENCES fines(id) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY uq_fine_waivers_number (tenant_id, waiver_number),
  INDEX idx_fine_waivers_fine_id (fine_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Notifications (User & Role Telemetry In-App Feeds)
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(64) NOT NULL,
  tenant_id VARCHAR(64) NOT NULL DEFAULT 'default-library',
  recipient_id VARCHAR(64) NOT NULL,
  recipient_role ENUM('ADMIN', 'LIBRARIAN', 'MEMBER', 'ALL') NULL,
  type ENUM('DUE_SOON', 'OVERDUE', 'RESERVATION_READY', 'RESERVATION_EXPIRING', 'FINE_CREATED', 'FINE_UPDATED', 'FINE_PAID', 'MEMBERSHIP_EXPIRING', 'SYSTEM_BROADCAST', 'BOOK_ISSUED', 'GENERAL') NOT NULL,
  priority ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at DATETIME NULL,
  related_entity_type ENUM('BOOK', 'LOAN', 'RESERVATION', 'FINE', 'MEMBER', 'SYSTEM') NULL,
  related_entity_id VARCHAR(64) NULL,
  book_title VARCHAR(500) NULL,
  book_cover_url VARCHAR(1024) NULL,
  action_label VARCHAR(100) NULL,
  action_route VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_notifications_tenant_recipient_read (tenant_id, recipient_id, is_read),
  INDEX idx_notifications_tenant_created (tenant_id, created_at),
  INDEX idx_notifications_tenant_type (tenant_id, type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Audit Logs (Immutable Append-Only Compliance Record)
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) NOT NULL,
  tenant_id VARCHAR(64) NOT NULL DEFAULT 'default-library',
  actor_id VARCHAR(64) NOT NULL,
  actor_role VARCHAR(64) NOT NULL DEFAULT 'SYSTEM',
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  old_value JSON NULL,
  new_value JSON NULL,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(500) NULL,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_audit_logs_tenant_timestamp (tenant_id, timestamp),
  INDEX idx_audit_logs_tenant_entity (tenant_id, entity_type, entity_id),
  INDEX idx_audit_logs_tenant_actor (tenant_id, actor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Library Settings (Tenant Institutional Parameters)
CREATE TABLE IF NOT EXISTS library_settings (
  id VARCHAR(64) NOT NULL,
  tenant_id VARCHAR(64) NOT NULL DEFAULT 'default-library',
  library_name VARCHAR(255) NOT NULL DEFAULT 'Central University Library',
  logo_url VARCHAR(1024) NULL,
  primary_color VARCHAR(50) NOT NULL DEFAULT '#18181B',
  secondary_color VARCHAR(50) NOT NULL DEFAULT '#71717A',
  contact_email VARCHAR(255) NOT NULL DEFAULT 'library@university.edu',
  phone VARCHAR(50) NOT NULL DEFAULT '+1 (555) 234-5678',
  address VARCHAR(500) NOT NULL DEFAULT '100 University Ave, Campus Center',
  website VARCHAR(255) NOT NULL DEFAULT 'https://library.university.edu',
  max_books_per_member INT NOT NULL DEFAULT 5,
  default_borrow_duration_days INT NOT NULL DEFAULT 14,
  max_renewal_limit INT NOT NULL DEFAULT 2,
  fine_per_day DECIMAL(10, 2) NOT NULL DEFAULT 5.00,
  grace_period_days INT NOT NULL DEFAULT 2,
  max_fine_cap DECIMAL(10, 2) NOT NULL DEFAULT 100.00,
  reservation_expiry_hours INT NOT NULL DEFAULT 48,
  currency_symbol VARCHAR(10) NOT NULL DEFAULT '$',
  operating_hours VARCHAR(255) NOT NULL DEFAULT 'Mon-Fri: 8am-10pm, Sat-Sun: 10am-6pm',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_settings_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
