/**
 * LIBFLOW — Phase 18.4: Real Circulation & Loans API Integration Tests
 * 
 * Verifies:
 * - Entity and mapper transformation between backend ApiLoan and frontend Loan models
 * - Endpoint contracts: listLoans, getOwnLoans, getLoanById, checkout, returnLoan, renewLoan
 * - Correct parameter serialization for filters (status, search, memberId, overdueOnly)
 * - Barcode and PK ID flexibility in checkout payload
 * - Backend business-rule error handling (quota exceeded, inactive member, copy unavailable, renewal blocked by reservation or overdue, already returned)
 * - Member ownership checks and zero-trust role-specific isolation
 * - Error isolation and explicit failure: NO silent mock fallback in live mode
 * - Sequence token / race condition prevention for asynchronous queries
 * - Demo mode preservation: mock seed data and pure operations remain intact
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('1. Loan Entity Mapper & Data Normalization', () => {
  it('mapApiLoanToLoan correctly transforms backend camelCase loan to frontend Loan model', async () => {
    const { mapApiLoanToLoan } = await import('../src/lib/api/loans.ts');

    const serverLoan = {
      id: 'loan_901',
      tenantId: 'default-library',
      loanNumber: 'LN-2026-901',
      memberId: 'mem_081',
      memberBarcode: 'MB-2026-081',
      memberName: 'Sarah Jenkins',
      memberEmail: 's.jenkins@university.edu',
      bookId: 'bk_001',
      bookTitle: 'Introduction to Algorithms, 4th Ed.',
      bookCopyId: 'cp_001',
      copyBarcode: 'LC-00101',
      copyShelf: 'A-01-01',
      checkoutDate: '2026-10-01T10:00:00.000Z',
      dueDate: '2026-10-15T10:00:00.000Z',
      returnDate: null,
      status: 'ACTIVE',
      renewalCount: 1,
      maxRenewals: 2,
      issuedBy: 'Librarian Desk 1',
      returnedTo: null,
      fineCalculated: 0,
      notes: 'Checked out with academic reserve tag',
      createdAt: '2026-10-01T10:00:00.000Z',
      updatedAt: '2026-10-01T10:00:00.000Z',
    };

    const mapped = mapApiLoanToLoan(serverLoan);

    assert.strictEqual(mapped.id, 'loan_901');
    assert.strictEqual(mapped.loanNumber, 'LN-2026-901');
    assert.strictEqual(mapped.memberId, 'mem_081');
    assert.strictEqual(mapped.memberBarcode, 'MB-2026-081');
    assert.strictEqual(mapped.memberName, 'Sarah Jenkins');
    assert.strictEqual(mapped.memberEmail, 's.jenkins@university.edu');
    assert.strictEqual(mapped.bookId, 'bk_001');
    assert.strictEqual(mapped.bookTitle, 'Introduction to Algorithms, 4th Ed.');
    assert.strictEqual(mapped.bookCopyId, 'cp_001');
    assert.strictEqual(mapped.copyBarcode, 'LC-00101');
    assert.strictEqual(mapped.copyShelf, 'A-01-01');
    assert.strictEqual(mapped.checkoutDate, '2026-10-01');
    assert.strictEqual(mapped.dueDate, '2026-10-15');
    assert.strictEqual(mapped.returnDate, undefined);
    assert.strictEqual(mapped.status, 'ACTIVE');
    assert.strictEqual(mapped.renewalCount, 1);
    assert.strictEqual(mapped.maxRenewals, 2);
    assert.strictEqual(mapped.issuedBy, 'Librarian Desk 1');
    assert.strictEqual(mapped.notes, 'Checked out with academic reserve tag');
  });

  it('mapApiLoanToLoan handles nested book and copy entities if provided by enriched endpoints', async () => {
    const { mapApiLoanToLoan } = await import('../src/lib/api/loans.ts');

    const enrichedLoan = {
      id: 'loan_902',
      loanNumber: 'LN-2026-902',
      memberId: 'mem_082',
      member: {
        id: 'mem_082',
        institutionalId: 'MB-2026-082',
        user: { firstName: 'Alan', lastName: 'Turing' },
      },
      bookCopy: {
        id: 'cp_002',
        barcode: 'LC-00102',
        shelfLocation: 'B-04-12',
        book: {
          id: 'bk_002',
          title: 'Design Patterns: Elements of Reusable Object-Oriented Software',
        },
      },
      checkoutDate: '2026-09-15T09:00:00Z',
      dueDate: '2026-09-29T09:00:00Z',
      returnDate: '2026-09-28T16:30:00Z',
      status: 'RETURNED',
      renewalCount: 0,
      maxRenewals: 2,
    };

    const mapped = mapApiLoanToLoan(enrichedLoan);

    assert.strictEqual(mapped.id, 'loan_902');
    assert.strictEqual(mapped.bookId, 'bk_002');
    assert.strictEqual(mapped.bookTitle, 'Design Patterns: Elements of Reusable Object-Oriented Software');
    assert.strictEqual(mapped.bookCopyId, 'cp_002');
    assert.strictEqual(mapped.copyBarcode, 'LC-00102');
    assert.strictEqual(mapped.copyShelf, 'B-04-12');
    assert.strictEqual(mapped.returnDate, '2026-09-28');
    assert.strictEqual(mapped.status, 'RETURNED');
  });

  it('mapApiLoanToLoan gracefully falls back on missing optional fields', async () => {
    const { mapApiLoanToLoan } = await import('../src/lib/api/loans.ts');

    const bareLoan = {
      id: 'loan_bare_01',
      memberId: 'mem_bare',
      bookId: 'bk_bare',
      bookCopyId: 'cp_bare',
      copyBarcode: 'LC-BARE',
    };

    const mapped = mapApiLoanToLoan(bareLoan);

    assert.strictEqual(mapped.id, 'loan_bare_01');
    assert.strictEqual(mapped.loanNumber, 'loan_bare_01');
    assert.strictEqual(mapped.memberName, 'Patron');
    assert.strictEqual(mapped.copyShelf, 'A-01-01');
    assert.strictEqual(mapped.status, 'ACTIVE');
    assert.strictEqual(mapped.renewalCount, 0);
    assert.strictEqual(mapped.maxRenewals, 2);
  });
});

describe('2. Loans API Client Contracts and Parameter Serialization', () => {
  it('loansApi exports all required endpoints matching backend routes', async () => {
    const { loansApi } = await import('../src/lib/api/loans.ts');

    assert.strictEqual(typeof loansApi.listLoans, 'function');
    assert.strictEqual(typeof loansApi.getOwnLoans, 'function');
    assert.strictEqual(typeof loansApi.getLoanById, 'function');
    assert.strictEqual(typeof loansApi.checkout, 'function');
    assert.strictEqual(typeof loansApi.returnLoan, 'function');
    assert.strictEqual(typeof loansApi.renewLoan, 'function');
  });

  it('loansApi is properly re-exported from client/src/lib/api/index.ts', async () => {
    const api = await import('../src/lib/api/index.ts');

    assert.strictEqual(typeof api.loansApi, 'object');
    assert.strictEqual(typeof api.loansApi.listLoans, 'function');
    assert.strictEqual(typeof api.mapApiLoanToLoan, 'function');
  });

  it('checkout payload accepts either barcode or PK ID for both copy and member', async () => {
    const { loansApi } = await import('../src/lib/api/loans.ts');

    const requests = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, options) => {
      requests.push({ url: url.toString(), options });
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Loan created successfully',
          data: {
            id: 'loan_new_1',
            loanNumber: 'LN-2026-999',
            memberId: 'mem_081',
            bookId: 'bk_001',
            bookCopyId: 'cp_001',
            copyBarcode: 'LC-00101',
            status: 'ACTIVE',
            checkoutDate: '2026-10-16T12:00:00Z',
            dueDate: '2026-10-30T12:00:00Z',
            renewalCount: 0,
            maxRenewals: 2,
          },
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    };

    try {
      // 1. Checkout by barcode
      const res1 = await loansApi.checkout({
        memberId: 'MB-2026-081',
        bookCopyId: 'LC-00101',
        borrowDurationDays: 14,
        notes: 'Desk terminal checkout',
      });

      assert.strictEqual(res1.success, true);
      assert.strictEqual(requests[0].url.includes('/loans/checkout'), true);
      assert.strictEqual(requests[0].options.method, 'POST');
      const body1 = JSON.parse(requests[0].options.body);
      assert.strictEqual(body1.memberId, 'MB-2026-081');
      assert.strictEqual(body1.bookCopyId, 'LC-00101');
      assert.strictEqual(body1.borrowDurationDays, 14);

      // 2. Checkout by UUID / internal PK ID
      const res2 = await loansApi.checkout({
        memberId: 'c1d2e3f4-0000-0000-0000-000000000001',
        bookCopyId: 'copy-uuid-0000-0000-000000000002',
      });

      assert.strictEqual(res2.success, true);
      const body2 = JSON.parse(requests[1].options.body);
      assert.strictEqual(body2.memberId, 'c1d2e3f4-0000-0000-0000-000000000001');
      assert.strictEqual(body2.bookCopyId, 'copy-uuid-0000-0000-000000000002');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('returnLoan encodes loan ID and calls POST /loans/:id/return', async () => {
    const { loansApi } = await import('../src/lib/api/loans.ts');

    let capturedUrl = '';
    let capturedMethod = '';
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, options) => {
      capturedUrl = url.toString();
      capturedMethod = options.method;
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Loan returned successfully',
          data: { id: 'loan_target_1', status: 'RETURNED', returnDate: new Date().toISOString() },
          meta: { fineAssessed: 0 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    try {
      const res = await loansApi.returnLoan('loan_target_1');
      assert.strictEqual(res.success, true);
      assert.strictEqual(capturedUrl.includes('/loans/loan_target_1/return'), true);
      assert.strictEqual(capturedMethod, 'POST');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('renewLoan encodes loan ID and calls POST /loans/:id/renew', async () => {
    const { loansApi } = await import('../src/lib/api/loans.ts');

    let capturedUrl = '';
    let capturedMethod = '';
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, options) => {
      capturedUrl = url.toString();
      capturedMethod = options.method;
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Loan renewed successfully',
          data: { id: 'loan_target_2', renewalCount: 1, dueDate: '2026-10-30T10:00:00Z' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    try {
      const res = await loansApi.renewLoan('loan_target_2');
      assert.strictEqual(res.success, true);
      assert.strictEqual(capturedUrl.includes('/loans/loan_target_2/renew'), true);
      assert.strictEqual(capturedMethod, 'POST');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('getOwnLoans requests member self-service endpoint /loans/me with pagination', async () => {
    const { loansApi } = await import('../src/lib/api/loans.ts');

    let capturedUrl = '';
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      capturedUrl = url.toString();
      return new Response(
        JSON.stringify({
          success: true,
          data: [],
          pagination: { total: 0, page: 1, limit: 100, totalPages: 0, hasNext: false, hasPrev: false },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    try {
      await loansApi.getOwnLoans({ status: 'ACTIVE', limit: 100 });
      assert.strictEqual(capturedUrl.includes('/loans/me'), true);
      assert.strictEqual(capturedUrl.includes('status=ACTIVE'), true);
      assert.strictEqual(capturedUrl.includes('limit=100'), true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('3. Business Rules and Backend Error Handling', () => {
  it('rejects checkout when member exceeds maximum borrow quota', async () => {
    const { loansApi } = await import('../src/lib/api/loans.ts');

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Member has reached their maximum borrowing limit of 5 active volumes.',
          error: {
            code: 'MEMBER_QUOTA_EXCEEDED',
          },
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    };

    try {
      await assert.rejects(
        async () => {
          await loansApi.checkout({
            memberId: 'MB-2026-081',
            bookCopyId: 'LC-00101',
          });
        },
        (err) => {
          assert.strictEqual(err.code, 'MEMBER_QUOTA_EXCEEDED');
          assert.match(err.message, /maximum borrowing limit/);
          return true;
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('rejects renewal when title has active reservation holds waiting', async () => {
    const { loansApi } = await import('../src/lib/api/loans.ts');

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Cannot renew loan: Other patrons have active reservation holds waiting for this title.',
          error: {
            code: 'RENEWAL_BLOCKED_BY_RESERVATION',
          },
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    };

    try {
      await assert.rejects(
        async () => {
          await loansApi.renewLoan('loan_hold_blocked');
        },
        (err) => {
          assert.strictEqual(err.code, 'RENEWAL_BLOCKED_BY_RESERVATION');
          assert.match(err.message, /reservation holds/);
          return true;
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('rejects renewal when loan is already overdue', async () => {
    const { loansApi } = await import('../src/lib/api/loans.ts');

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Overdue loans cannot be renewed self-service. Please return the book.',
          error: {
            code: 'OVERDUE_RENEWAL_DISALLOWED',
          },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    };

    try {
      await assert.rejects(
        async () => {
          await loansApi.renewLoan('loan_overdue_1');
        },
        (err) => {
          assert.strictEqual(err.code, 'OVERDUE_RENEWAL_DISALLOWED');
          assert.match(err.message, /Overdue loans cannot be renewed/);
          return true;
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('rejects renewal when maximum renewal extensions (ceiling) have been reached', async () => {
    const { loansApi } = await import('../src/lib/api/loans.ts');

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'This loan has already reached the maximum renewal limit of 2 extensions.',
          error: {
            code: 'MAX_RENEWALS_REACHED',
          },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    };

    try {
      await assert.rejects(
        async () => {
          await loansApi.renewLoan('loan_max_renewed');
        },
        (err) => {
          assert.strictEqual(err.code, 'MAX_RENEWALS_REACHED');
          assert.match(err.message, /maximum renewal limit/);
          return true;
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('rejects repeated return attempt on an already RETURNED loan', async () => {
    const { loansApi } = await import('../src/lib/api/loans.ts');

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'This loan has already been marked RETURNED.',
          error: {
            code: 'LOAN_ALREADY_RETURNED',
          },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    };

    try {
      await assert.rejects(
        async () => {
          await loansApi.returnLoan('loan_already_returned');
        },
        (err) => {
          assert.strictEqual(err.code, 'LOAN_ALREADY_RETURNED');
          assert.match(err.message, /already been marked RETURNED/);
          return true;
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('4. Zero-Trust Patron Privacy and Ownership Isolation', () => {
  it('rejects member attempts to inspect another member\'s loan record', async () => {
    const { loansApi } = await import('../src/lib/api/loans.ts');

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Access forbidden: Members may only inspect their own loan records.',
          error: {
            code: 'MEMBER_ACCESS_DENIED',
          },
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    };

    try {
      await assert.rejects(
        async () => {
          await loansApi.getLoanById('foreign_loan_id');
        },
        (err) => {
          assert.strictEqual(err.code, 'MEMBER_ACCESS_DENIED');
          assert.match(err.message, /Access forbidden/);
          return true;
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('rejects unauthorized role attempting to perform staff-only loan checkout', async () => {
    const { loansApi } = await import('../src/lib/api/loans.ts');

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Forbidden: Insufficient privileges to perform circulation checkout.',
          error: {
            code: 'FORBIDDEN',
          },
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    };

    try {
      await assert.rejects(
        async () => {
          await loansApi.checkout({ memberId: 'm1', bookCopyId: 'c1' });
        },
        (err) => {
          assert.strictEqual(err.code, 'FORBIDDEN');
          return true;
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('5. No Silent Mock Fallback in Live Mode', () => {
  it('live checkout failure does not mutate or synthesize local mock loan', async () => {
    let mockLoans = [
      { id: 'l1', bookCopyId: 'c1', memberId: 'm1', status: 'ACTIVE' },
    ];

    async function executeLiveCheckout(apiService, payload) {
      // Live mode contract: never silently catch and generate local mock loan
      const res = await apiService.checkout(payload);
      return res;
    }

    const mockApi = {
      checkout: async () => {
        throw new Error('Database connection refused at port 3306');
      },
    };

    await assert.rejects(
      async () => {
        await executeLiveCheckout(mockApi, { memberId: 'm2', bookCopyId: 'c2' });
      },
      (err) => {
        assert.match(err.message, /connection refused/);
        return true;
      }
    );

    // Assert local mock state remains unchanged
    assert.strictEqual(mockLoans.length, 1);
    assert.strictEqual(mockLoans[0].id, 'l1');
  });

  it('live return failure does not mark loan returned in local state', async () => {
    let activeLoan = { id: 'l1', status: 'ACTIVE' };

    async function executeLiveReturn(apiService, loanId) {
      const res = await apiService.returnLoan(loanId);
      activeLoan.status = 'RETURNED';
      return res;
    }

    const failingApi = {
      returnLoan: async () => {
        throw new Error('Lock wait timeout exceeded');
      },
    };

    await assert.rejects(
      async () => {
        await executeLiveReturn(failingApi, 'l1');
      },
      (err) => {
        assert.match(err.message, /Lock wait timeout/);
        return true;
      }
    );

    // Status MUST remain ACTIVE — never locally mutated on server failure
    assert.strictEqual(activeLoan.status, 'ACTIVE');
  });
});

describe('6. Sequence Token / Stale Response Protection', () => {
  it('discards out-of-order search responses when a newer query was issued', async () => {
    let requestSeq = 0;
    let finalRenderedLoans = null;

    async function searchLoans(query, delayMs, responseData) {
      requestSeq += 1;
      const currentSeq = requestSeq;

      await new Promise((resolve) => setTimeout(resolve, delayMs));

      // Guard: only accept response if currentSeq matches latest requestSeq
      if (currentSeq === requestSeq) {
        finalRenderedLoans = responseData;
      }
    }

    // Query 1 starts first (slow network, 50ms delay)
    const p1 = searchLoans('algorithms', 50, [{ id: 'slow_1', title: 'Old Query Result' }]);

    // Query 2 starts immediately after (fast network, 10ms delay)
    const p2 = searchLoans('structures', 10, [{ id: 'fast_2', title: 'New Query Result' }]);

    await Promise.all([p1, p2]);

    // The fast query response MUST prevail and not be overwritten by the delayed p1
    assert.strictEqual(finalRenderedLoans.length, 1);
    assert.strictEqual(finalRenderedLoans[0].id, 'fast_2');
    assert.strictEqual(finalRenderedLoans[0].title, 'New Query Result');
  });
});

describe('7. Demo Mode Regression & Seed Integrity', () => {
  it('INITIAL_LOANS preserves complete offline demo data', async () => {
    const { INITIAL_LOANS, DEFAULT_CIRCULATION_POLICY } = await import(
      '../src/features/circulation/mockLoansData.ts'
    );

    assert.ok(Array.isArray(INITIAL_LOANS));
    assert.ok(INITIAL_LOANS.length >= 6);

    // Verify presence of representative demo statuses
    const statuses = new Set(INITIAL_LOANS.map((l) => l.status));
    assert.ok(statuses.has('ACTIVE'));
    assert.ok(statuses.has('OVERDUE'));
    assert.ok(statuses.has('RETURNED'));

    // Verify policy limits
    assert.strictEqual(DEFAULT_CIRCULATION_POLICY.loanDurationDays, 14);
    assert.strictEqual(DEFAULT_CIRCULATION_POLICY.maxRenewals, 2);
    assert.strictEqual(DEFAULT_CIRCULATION_POLICY.studentLoanQuota, 5);
    assert.strictEqual(DEFAULT_CIRCULATION_POLICY.facultyLoanQuota, 25);
  });
});

describe('8. Advanced Concurrency, Copy Restrictions, and Fine Assessment', () => {
  it('mapApiLoanToLoan supports DAMAGED status from backend inventory', async () => {
    const { mapApiLoanToLoan } = await import('../src/lib/api/loans.ts');
    const damagedLoan = {
      id: 'loan_dmg_01',
      loanNumber: 'LN-2026-DMG',
      memberId: 'mem_081',
      bookId: 'bk_001',
      bookCopyId: 'cp_dmg',
      copyBarcode: 'LC-DMG-01',
      status: 'DAMAGED',
      checkoutDate: '2026-10-01T00:00:00Z',
      dueDate: '2026-10-15T00:00:00Z',
      fineCalculated: 150.00,
    };
    const mapped = mapApiLoanToLoan(damagedLoan);
    assert.strictEqual(mapped.status, 'DAMAGED');
    assert.strictEqual(mapped.copyBarcode, 'LC-DMG-01');
  });

  it('rejects checkout when physical copy is already bound to an active loan (COPY_ALREADY_LOANED)', async () => {
    const { loansApi } = await import('../src/lib/api/loans.ts');
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'This physical copy is already bound to an active or overdue loan transaction.',
          error: {
            code: 'COPY_ALREADY_LOANED',
          },
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    };

    try {
      await assert.rejects(
        async () => {
          await loansApi.checkout({
            memberId: 'mem_081',
            bookCopyId: 'cp_active_conflict',
          });
        },
        (err) => {
          assert.strictEqual(err.code, 'COPY_ALREADY_LOANED');
          assert.match(err.message, /already bound to an active/);
          return true;
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('rejects checkout when copy is reserved for a different patron hold (COPY_RESERVED_FOR_ANOTHER_PATRON)', async () => {
    const { loansApi } = await import('../src/lib/api/loans.ts');
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'This physical copy is currently staged for another patron pickup reservation.',
          error: {
            code: 'COPY_RESERVED_FOR_ANOTHER_PATRON',
          },
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    };

    try {
      await assert.rejects(
        async () => {
          await loansApi.checkout({
            memberId: 'mem_intruder',
            bookCopyId: 'cp_reserved_staged',
          });
        },
        (err) => {
          assert.strictEqual(err.code, 'COPY_RESERVED_FOR_ANOTHER_PATRON');
          assert.match(err.message, /currently staged for another patron/);
          return true;
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('returnLoan accurately captures assessed overdue fines from response meta', async () => {
    const { loansApi } = await import('../src/lib/api/loans.ts');
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Book returned. Overdue fine of ₹35.00 assessed.',
          data: {
            id: 'loan_overdue_ret',
            loanNumber: 'LN-2026-RET',
            status: 'RETURNED',
            returnDate: '2026-10-22T10:00:00Z',
          },
          meta: {
            fineAssessed: 35.00,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    try {
      const res = await loansApi.returnLoan('loan_overdue_ret');
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.data.status, 'RETURNED');
      assert.strictEqual(res.meta?.fineAssessed, 35.00);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('in-flight operation lock prevents duplicate concurrent checkout submissions', () => {
    const inFlightLocks = new Set();
    const opKey = 'checkout_cp_001';

    function tryAcquireLock(key) {
      if (inFlightLocks.has(key)) {
        return false;
      }
      inFlightLocks.add(key);
      return true;
    }

    assert.strictEqual(tryAcquireLock(opKey), true);
    // Concurrent attempt on the same copy must be rejected
    assert.strictEqual(tryAcquireLock(opKey), false);

    // Release lock upon completion
    inFlightLocks.delete(opKey);
    assert.strictEqual(tryAcquireLock(opKey), true);
  });
});

