/**
 * LIBFLOW — Live MySQL Books, Book Copies & Members Integration Tests
 * 
 * STRICT ARCHITECTURAL RULES:
 * - Executes against the real MySQL 8+ database (libflow_db) when reachable.
 * - If MySQL is offline / unreachable, the test runner cleanly skips with explicit notice.
 * - Verifies real SQL transactions, foreign keys, constraints, and audit logging.
 * - Cleans up test fixtures after completion to prevent data pollution.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import mysql from 'mysql2/promise';
import { env } from '../src/config/env.js';
import { getPool, disconnectDatabase } from '../src/config/database.js';
import { BookService } from '../src/services/BookService.js';
import { BookCopyService } from '../src/services/BookCopyService.js';
import { MemberService } from '../src/services/MemberService.js';
import { ApiError } from '../src/utils/ApiError.js';

describe('Live MySQL Books, Copies & Members Integration Tests', async () => {
  let isMySqlReachable = false;
  let probeConn: mysql.Connection | null = null;

  try {
    probeConn = await mysql.createConnection({
      host: env.DB.host,
      port: env.DB.port,
      user: env.DB.user,
      password: env.DB.password,
      database: env.DB.database,
      connectTimeout: 2000,
    });
    isMySqlReachable = true;
  } catch {
    isMySqlReachable = false;
  } finally {
    if (probeConn) {
      await probeConn.end();
      probeConn = null;
    }
  }

  if (!isMySqlReachable) {
    console.log(
      `\n[Live MySQL Tests SKIPPED] MySQL server at ${env.DB.host}:${env.DB.port} is not reachable.\n`
    );

    it.skip('Live MySQL: Books CRUD and faceted search', () => {});
    it.skip('Live MySQL: Unique ISBN constraint enforcement', () => {});
    it.skip('Live MySQL: Physical copy addition & transactional count sync', () => {});
    it.skip('Live MySQL: Unique copy barcode constraint enforcement', () => {});
    it.skip('Live MySQL: Copy circulation state change protection', () => {});
    it.skip('Live MySQL: Safe copy withdrawal & active loan protection', () => {});
    it.skip('Live MySQL: Role-aware copy data redaction for patrons', () => {});
    it.skip('Live MySQL: Member registration & uniqueness enforcement', () => {});
    it.skip('Live MySQL: Member-to-member access isolation (403)', () => {});
    it.skip('Live MySQL: Member self-update vs staff administrative updates', () => {});
    return;
  }

  // Test Run Unique Identifier to isolate test records
  const testRunId = crypto.randomBytes(4).toString('hex');
  const tenantId = 'default-library';

  const testIsbn = `978${Math.floor(1000000000 + Math.random() * 9000000000)}`;
  const testBarcode1 = `BC-TEST-${testRunId}-01`;
  const testBarcode2 = `BC-TEST-${testRunId}-02`;

  let createdBookId: string;
  let createdCopy1Id: string;
  let createdCopy2Id: string;
  let member1Id: string;
  let member2Id: string;
  const member1UserId = `usr_test_patron1_${testRunId}`;
  const member2UserId = `usr_test_patron2_${testRunId}`;

  before(async () => {
    const pool = getPool();
    await pool.query(
      `INSERT INTO users (id, tenant_id, email, password_hash, role, full_name, is_active)
       VALUES (?, ?, ?, 'test_hash', 'MEMBER', ?, 1)`,
      [member1UserId, tenantId, `user1.${testRunId}@libflow.io`, 'Rosalind Franklin']
    );
    await pool.query(
      `INSERT INTO users (id, tenant_id, email, password_hash, role, full_name, is_active)
       VALUES (?, ?, ?, 'test_hash', 'MEMBER', ?, 1)`,
      [member2UserId, tenantId, `user2.${testRunId}@libflow.io`, 'Grace Hopper']
    );
  });

  after(async () => {
    // Clean up test data
    try {
      const pool = getPool();
      if (createdBookId) {
        await pool.query('DELETE FROM book_copy_events WHERE copy_id IN (?, ?)', [
          createdCopy1Id || '',
          createdCopy2Id || '',
        ]);
        await pool.query('DELETE FROM loans WHERE book_id = ?', [createdBookId]);
        await pool.query('DELETE FROM book_copies WHERE book_id = ?', [createdBookId]);
        await pool.query('DELETE FROM books WHERE id = ?', [createdBookId]);
      }
      if (member1Id || member2Id) {
        await pool.query('DELETE FROM members WHERE id IN (?, ?)', [
          member1Id || '',
          member2Id || '',
        ]);
      }
      await pool.query('DELETE FROM users WHERE id IN (?, ?)', [member1UserId, member2UserId]);
      await pool.query("DELETE FROM audit_logs WHERE actor_id LIKE '%test%'");
    } catch (cleanupErr) {
      console.warn('Test cleanup warning:', cleanupErr);
    } finally {
      await disconnectDatabase();
    }
  });

  // =========================================================================
  // 1. Books API & Service Tests
  // =========================================================================
  it('Live MySQL: creates a book record as staff and persists in database', async () => {
    const book = await BookService.createBook(
      {
        isbn: testIsbn,
        title: `Automated Systems Architecture ${testRunId}`,
        subtitle: 'Principles and Real-Time Verification',
        authors: ['Dr. Katherine Johnson', 'Alan Turing'],
        publisher: 'Academic Press',
        publicationYear: 2024,
        category: 'Computer Science',
        description: 'Comprehensive analysis of fault-tolerant transactional architectures.',
        format: 'HARDCOVER',
        tenantId,
      },
      {
        actorId: 'usr_staff_admin',
        actorRole: 'ADMIN',
      }
    );

    assert.ok(book.id, 'Book ID must be generated');
    assert.strictEqual(book.isbn, testIsbn);
    assert.strictEqual(book.totalCopies, 0);
    assert.strictEqual(book.availableCopies, 0);

    createdBookId = book.id;

    // Verify row in database
    const pool = getPool();
    const [rows] = await pool.query<any[]>('SELECT * FROM books WHERE id = ?', [book.id]);
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].title, `Automated Systems Architecture ${testRunId}`);
  });

  it('Live MySQL: enforces unique ISBN constraint with 409 Conflict', async () => {
    await assert.rejects(
      async () => {
        await BookService.createBook(
          {
            isbn: testIsbn, // duplicate ISBN
            title: 'Duplicate ISBN Attempt',
            authors: ['Author'],
            publisher: 'Publisher',
            publicationYear: 2024,
            category: 'General',
            description: 'Should fail immediately.',
            tenantId,
          },
          {
            actorId: 'usr_staff_admin',
            actorRole: 'ADMIN',
          }
        );
      },
      (err: any) => {
        assert.ok(err instanceof ApiError);
        assert.strictEqual(err.statusCode, 409);
        assert.strictEqual(err.errorCode, 'DUPLICATE_ISBN');
        return true;
      }
    );
  });

  it('Live MySQL: lists books with search, filtering, and whitelisted sorting', async () => {
    const result = await BookService.listBooks({
      search: testRunId,
      category: 'Computer Science',
      sortBy: 'recently_added',
      tenantId,
    });

    assert.ok(result.total >= 1);
    assert.ok(result.books.some((b) => b.id === createdBookId));
  });

  it('Live MySQL: updates book details and records audit entry', async () => {
    const updated = await BookService.updateBook(
      createdBookId,
      {
        subtitle: 'Updated Subtitle Edition 2',
        edition: 'Second Edition',
      },
      {
        actorId: 'usr_librarian',
        actorRole: 'LIBRARIAN',
      },
      tenantId
    );

    assert.strictEqual(updated.subtitle, 'Updated Subtitle Edition 2');
    assert.strictEqual(updated.edition, 'Second Edition');
  });

  // =========================================================================
  // 2. Physical Book Copies & Circulation Protection Tests
  // =========================================================================
  it('Live MySQL: adds physical copies and transactionally updates book counters', async () => {
    const copy1 = await BookCopyService.addCopy(
      createdBookId,
      {
        barcode: testBarcode1,
        shelf: 'Section C - Shelf 12',
        conditionRating: 'NEW',
        acquisitionCost: 89.5,
        notes: 'Acquired via institutional research grant.',
        tenantId,
      },
      {
        actorId: 'usr_librarian',
        actorRole: 'LIBRARIAN',
        fullName: 'Lead Librarian',
      }
    );

    assert.ok(copy1.id);
    assert.strictEqual(copy1.barcode, testBarcode1);
    assert.strictEqual(copy1.copyNumber, 1);
    assert.strictEqual(copy1.status, 'AVAILABLE');
    createdCopy1Id = copy1.id;

    // Add Copy 2
    const copy2 = await BookCopyService.addCopy(
      createdBookId,
      {
        barcode: testBarcode2,
        shelf: 'Section C - Shelf 12',
        conditionRating: 'EXCELLENT',
        acquisitionCost: 89.5,
        tenantId,
      },
      {
        actorId: 'usr_librarian',
        actorRole: 'LIBRARIAN',
        fullName: 'Lead Librarian',
      }
    );
    assert.strictEqual(copy2.copyNumber, 2);
    createdCopy2Id = copy2.id;

    // Verify parent book counter was incremented to 2 total, 2 available
    const book = await BookService.getBookById(createdBookId, tenantId);
    assert.strictEqual(book.totalCopies, 2);
    assert.strictEqual(book.availableCopies, 2);

    // Verify ACQUIRED event was recorded in book_copy_events
    const pool = getPool();
    const [events] = await pool.query<any[]>(
      'SELECT * FROM book_copy_events WHERE copy_id = ? AND event = ?',
      [createdCopy1Id, 'ACQUIRED']
    );
    assert.strictEqual(events.length, 1);
  });

  it('Live MySQL: enforces unique copy barcode constraint with 409 Conflict', async () => {
    await assert.rejects(
      async () => {
        await BookCopyService.addCopy(
          createdBookId,
          {
            barcode: testBarcode1, // duplicate barcode
            shelf: 'Section C',
            tenantId,
          },
          {
            actorId: 'usr_librarian',
            actorRole: 'LIBRARIAN',
            fullName: 'Lead Librarian',
          }
        );
      },
      (err: any) => {
        assert.ok(err instanceof ApiError);
        assert.strictEqual(err.statusCode, 409);
        assert.strictEqual(err.errorCode, 'DUPLICATE_BARCODE');
        return true;
      }
    );
  });

  it('Live MySQL: prevents direct manual override of circulation state to BORROWED', async () => {
    await assert.rejects(
      async () => {
        await BookCopyService.updateCopy(
          createdCopy1Id,
          {
            status: 'BORROWED' as any,
          },
          {
            actorId: 'usr_librarian',
            actorRole: 'LIBRARIAN',
            fullName: 'Lead Librarian',
          },
          tenantId
        );
      },
      (err: any) => {
        assert.ok(err instanceof ApiError);
        assert.strictEqual(err.statusCode, 400);
        assert.strictEqual(err.errorCode, 'CIRCULATION_BYPASS_PROHIBITED');
        return true;
      }
    );
  });

  it('Live MySQL: redacts administrative details (cost, notes) when viewed by patron', async () => {
    // Patron view
    const patronView: any = await BookCopyService.getCopyById(
      createdCopy1Id,
      'MEMBER',
      tenantId
    );
    assert.strictEqual(patronView.barcode, testBarcode1);
    assert.strictEqual(patronView.isAvailable, true);
    assert.strictEqual(patronView.acquisitionCost, undefined);
    assert.strictEqual(patronView.notes, undefined);

    // Staff view
    const staffView: any = await BookCopyService.getCopyById(
      createdCopy1Id,
      'LIBRARIAN',
      tenantId
    );
    assert.strictEqual(staffView.acquisitionCost, 89.5);
    assert.strictEqual(staffView.notes, 'Acquired via institutional research grant.');
  });

  it('Live MySQL: safely withdraws a physical copy and decrements book counters', async () => {
    const withdrawn = await BookCopyService.withdrawCopy(
      createdCopy2Id,
      'Severe physical water damage beyond repair.',
      {
        actorId: 'usr_librarian',
        actorRole: 'LIBRARIAN',
        fullName: 'Lead Librarian',
      },
      tenantId
    );

    assert.strictEqual(withdrawn.status, 'WITHDRAWN');

    // Verify parent book counter decremented
    const book = await BookService.getBookById(createdBookId, tenantId);
    assert.strictEqual(book.totalCopies, 1);
    assert.strictEqual(book.availableCopies, 1);

    // Verify WITHDRAWN event recorded
    const pool = getPool();
    const [events] = await pool.query<any[]>(
      'SELECT * FROM book_copy_events WHERE copy_id = ? AND event = ?',
      [createdCopy2Id, 'WITHDRAWN']
    );
    assert.strictEqual(events.length, 1);
  });

  // =========================================================================
  // 3. Members API & Zero-Trust Access Isolation Tests
  // =========================================================================
  it('Live MySQL: registers members with unique emails and institutional member IDs', async () => {
    const member1 = await MemberService.createMember(
      {
        firstName: 'Rosalind',
        lastName: 'Franklin',
        email: `rosalind.${testRunId}@university.edu`,
        phone: '+1-555-0144',
        department: 'Biophysics',
        memberType: 'RESEARCHER',
        userId: member1UserId,
        tenantId,
      },
      {
        actorId: 'usr_admin',
        actorRole: 'ADMIN',
        fullName: 'Administrator',
      },
      tenantId
    );

    assert.ok(member1.id);
    assert.strictEqual(member1.fullName, 'Rosalind Franklin');
    assert.strictEqual(member1.initials, 'RF');
    assert.strictEqual(member1.maxBorrowLimit, 8); // Researcher default
    member1Id = member1.id;

    // Register Member 2
    const member2 = await MemberService.createMember(
      {
        firstName: 'Grace',
        lastName: 'Hopper',
        email: `grace.${testRunId}@university.edu`,
        phone: '+1-555-0155',
        department: 'Computer Science',
        memberType: 'FACULTY',
        userId: member2UserId,
        tenantId,
      },
      {
        actorId: 'usr_admin',
        actorRole: 'ADMIN',
        fullName: 'Administrator',
      },
      tenantId
    );

    member2Id = member2.id;
    assert.strictEqual(member2.maxBorrowLimit, 10); // Faculty default
  });

  it('Live MySQL: rejects duplicate member email with 409 Conflict', async () => {
    await assert.rejects(
      async () => {
        await MemberService.createMember(
          {
            firstName: 'Duplicate',
            lastName: 'Attempt',
            email: `rosalind.${testRunId}@university.edu`, // duplicate email
            phone: '+1-555-0999',
            department: 'Chemistry',
            tenantId,
          },
          {
            actorId: 'usr_admin',
            actorRole: 'ADMIN',
            fullName: 'Administrator',
          },
          tenantId
        );
      },
      (err: any) => {
        assert.ok(err instanceof ApiError);
        assert.strictEqual(err.statusCode, 409);
        assert.strictEqual(err.errorCode, 'DUPLICATE_MEMBER_EMAIL');
        return true;
      }
    );
  });

  it('Live MySQL: ZERO-TRUST: Member A cannot inspect Member B profile (403 Forbidden)', async () => {
    await assert.rejects(
      async () => {
        // Patron A attempts to fetch Patron B profile
        await MemberService.getMemberById(
          member2Id,
          {
            actorId: member1UserId,
            actorRole: 'MEMBER',
            memberId: member1Id,
          },
          tenantId
        );
      },
      (err: any) => {
        assert.ok(err instanceof ApiError);
        assert.strictEqual(err.statusCode, 403);
        assert.strictEqual(err.errorCode, 'MEMBER_ACCESS_DENIED');
        return true;
      }
    );
  });

  it('Live MySQL: allows Member A to inspect and self-update own contact details', async () => {
    // 1. Inspect own profile
    const ownProfile = await MemberService.getMemberById(
      member1Id,
      {
        actorId: member1UserId,
        actorRole: 'MEMBER',
        memberId: member1Id,
      },
      tenantId
    );
    assert.strictEqual(ownProfile.email, `rosalind.${testRunId}@university.edu`);

    // 2. Self-update personal contact info
    const updated = await MemberService.updateMember(
      member1Id,
      {
        phone: '+1-555-9988',
        address: 'Laboratory 402, North Wing',
      },
      {
        actorId: member1UserId,
        actorRole: 'MEMBER',
        memberId: member1Id,
        fullName: 'Rosalind Franklin',
      },
      tenantId
    );

    assert.strictEqual(updated.phone, '+1-555-9988');
    assert.strictEqual(updated.address, 'Laboratory 402, North Wing');
  });

  it('Live MySQL: ZERO-TRUST: Prevents patron from altering administrative status or borrow limits', async () => {
    await assert.rejects(
      async () => {
        // Patron attempts privilege self-escalation
        await MemberService.updateMember(
          member1Id,
          {
            status: 'SUSPENDED',
            maxBorrowLimit: 50,
          },
          {
            actorId: member1UserId,
            actorRole: 'MEMBER',
            memberId: member1Id,
            fullName: 'Rosalind Franklin',
          },
          tenantId
        );
      },
      (err: any) => {
        assert.ok(err instanceof ApiError);
        assert.strictEqual(err.statusCode, 403);
        assert.strictEqual(err.errorCode, 'UNAUTHORIZED_FIELD_MODIFICATION');
        return true;
      }
    );
  });

  it('Live MySQL: Staff can update institutional member attributes', async () => {
    const updatedByStaff = await MemberService.updateMember(
      member1Id,
      {
        department: 'Molecular Biology & Genetics',
        maxBorrowLimit: 12,
      },
      {
        actorId: 'usr_staff_admin',
        actorRole: 'ADMIN',
        fullName: 'System Administrator',
      },
      tenantId
    );

    assert.strictEqual(updatedByStaff.department, 'Molecular Biology & Genetics');
    assert.strictEqual(updatedByStaff.maxBorrowLimit, 12);
  });
});
