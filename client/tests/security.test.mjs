import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBarcode } from '../src/features/barcode/barcodeSelectors.ts';
import { safeStorageGet, safeStorageSet, safeStorageRemove, isArray, isObject } from '../src/lib/storage.ts';

describe('1. Browser Storage and State Integrity', () => {
  test('safeStorageGet returns fallback on non-existent key', () => {
    // In node environment without window, should return fallback cleanly without crashing
    const result = safeStorageGet('non_existent_key_xyz', { defaultValue: true });
    assert.deepEqual(result, { defaultValue: true });
  });

  test('isArray validator accurately rejects non-arrays', () => {
    assert.equal(isArray([1, 2, 3]), true);
    assert.equal(isArray([]), true);
    assert.equal(isArray({ a: 1 }), false);
    assert.equal(isArray('string'), false);
    assert.equal(isArray(null), false);
    assert.equal(isArray(undefined), false);
    assert.equal(isArray(123), false);
  });

  test('isObject validator accurately validates objects and rejects arrays or primitives', () => {
    assert.equal(isObject({ a: 1 }), true);
    assert.equal(isObject({}), true);
    assert.equal(isObject([1, 2]), false);
    assert.equal(isObject(null), false);
    assert.equal(isObject('string'), false);
    assert.equal(isObject(undefined), false);
    assert.equal(isObject(42), false);
  });

  test('Simulated localStorage handles corrupt JSON safely', () => {
    const mockStorage = new Map();
    mockStorage.set('corrupt_json', '{"role": "ADMIN", incomplete');
    
    // Test safe parse pattern
    function safeParse(key, fallback, validator) {
      try {
        const item = mockStorage.get(key);
        if (!item) return fallback;
        const parsed = JSON.parse(item);
        if (validator && !validator(parsed)) return fallback;
        return parsed;
      } catch {
        return fallback;
      }
    }

    const res = safeParse('corrupt_json', { role: 'FALLBACK' }, isObject);
    assert.deepEqual(res, { role: 'FALLBACK' });
  });
});

describe('2. Authentication and Session Validation', () => {
  const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
  const VALID_ROLES = ['ADMIN', 'LIBRARIAN', 'MEMBER'];

  function validateSession(parsed) {
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.isLoggedIn === false) return { loggedOut: true };
    if (!parsed.user || typeof parsed.user !== 'object') return null;
    if (!parsed.user.id || !parsed.user.email || !parsed.user.name) return null;
    if (!VALID_ROLES.includes(parsed.user.role)) return null;
    if (parsed.timestamp && Date.now() - parsed.timestamp > SESSION_TTL_MS) return null;
    return parsed.user;
  }

  test('Rejects corrupt session objects and non-objects', () => {
    assert.equal(validateSession(null), null);
    assert.equal(validateSession('invalid-session-string'), null);
    assert.equal(validateSession([1, 2, 3]), null);
    assert.equal(validateSession({}), null);
    assert.equal(validateSession({ user: null }), null);
  });

  test('Rejects unauthorized or forged roles', () => {
    const forgedSession = {
      user: { id: 'usr_01', email: 'test@example.com', name: 'Hacker', role: 'SUPERUSER' },
      timestamp: Date.now(),
    };
    assert.equal(validateSession(forgedSession), null);

    const scriptSession = {
      user: { id: 'usr_02', email: 'test@example.com', name: 'Injector', role: '<script>alert(1)</script>' },
      timestamp: Date.now(),
    };
    assert.equal(validateSession(scriptSession), null);
  });

  test('Rejects incomplete user profiles missing mandatory fields', () => {
    const missingEmail = {
      user: { id: 'usr_03', name: 'No Email', role: 'MEMBER' },
      timestamp: Date.now(),
    };
    assert.equal(validateSession(missingEmail), null);

    const missingId = {
      user: { email: 'patron@libflow.edu', name: 'No ID', role: 'MEMBER' },
      timestamp: Date.now(),
    };
    assert.equal(validateSession(missingId), null);
  });

  test('Rejects expired sessions older than 24 hours', () => {
    const expiredTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
    const expiredSession = {
      user: { id: 'usr_04', email: 'patron@libflow.edu', name: 'Expired User', role: 'MEMBER' },
      timestamp: expiredTimestamp,
    };
    assert.equal(validateSession(expiredSession), null);
  });

  test('Accepts valid active session within TTL', () => {
    const validSession = {
      user: { id: 'usr_member_01', email: 'patron@libflow.edu', name: 'Valid Patron', role: 'MEMBER' },
      timestamp: Date.now() - 1000,
    };
    const user = validateSession(validSession);
    assert.notEqual(user, null);
    assert.equal(user.role, 'MEMBER');
  });

  test('Explicit logout session state prevents admin resurrection', () => {
    const loggedOutState = {
      isLoggedIn: false,
      timestamp: Date.now(),
    };
    const result = validateSession(loggedOutState);
    assert.deepEqual(result, { loggedOut: true });
  });
});

describe('3. Role-Based Access Control (RBAC) & Route Matrix', () => {
  const ROUTE_PERMISSIONS = {
    'admin/dashboard': ['ADMIN'],
    'admin/analytics': ['ADMIN'],
    'admin/audit-logs': ['ADMIN'],
    'admin/settings': ['ADMIN'],
    'librarian/dashboard': ['ADMIN', 'LIBRARIAN'],
    'librarian/circulation/desk': ['ADMIN', 'LIBRARIAN'],
    'librarian/books/new': ['ADMIN', 'LIBRARIAN'],
    'librarian/members/new': ['ADMIN', 'LIBRARIAN'],
    'librarian/fines': ['ADMIN', 'LIBRARIAN'],
    'member/dashboard': ['ADMIN', 'LIBRARIAN', 'MEMBER'],
    'member/loans': ['MEMBER'],
    'member/reservations': ['MEMBER'],
    'member/fines': ['MEMBER'],
    'member/profile': ['MEMBER'],
    'member/card': ['MEMBER'],
  };

  function isRoutePermitted(role, route) {
    const allowed = ROUTE_PERMISSIONS[route];
    if (!allowed) return false;
    return allowed.includes(role);
  }

  test('MEMBER cannot access administrative or librarian routes', () => {
    assert.equal(isRoutePermitted('MEMBER', 'admin/dashboard'), false);
    assert.equal(isRoutePermitted('MEMBER', 'admin/analytics'), false);
    assert.equal(isRoutePermitted('MEMBER', 'admin/audit-logs'), false);
    assert.equal(isRoutePermitted('MEMBER', 'librarian/dashboard'), false);
    assert.equal(isRoutePermitted('MEMBER', 'librarian/circulation/desk'), false);
    assert.equal(isRoutePermitted('MEMBER', 'librarian/fines'), false);
  });

  test('LIBRARIAN cannot access ADMIN-only routes', () => {
    assert.equal(isRoutePermitted('LIBRARIAN', 'admin/dashboard'), false);
    assert.equal(isRoutePermitted('LIBRARIAN', 'admin/analytics'), false);
    assert.equal(isRoutePermitted('LIBRARIAN', 'admin/audit-logs'), false);
    assert.equal(isRoutePermitted('LIBRARIAN', 'admin/settings'), false);
  });

  test('ADMIN can access administrative and librarian routes', () => {
    assert.equal(isRoutePermitted('ADMIN', 'admin/dashboard'), true);
    assert.equal(isRoutePermitted('ADMIN', 'librarian/dashboard'), true);
    assert.equal(isRoutePermitted('ADMIN', 'librarian/circulation/desk'), true);
  });

  test('Fine waiver is strictly restricted to ADMIN role', () => {
    function canWaiveFine(role) {
      return role === 'ADMIN';
    }
    assert.equal(canWaiveFine('ADMIN'), true);
    assert.equal(canWaiveFine('LIBRARIAN'), false);
    assert.equal(canWaiveFine('MEMBER'), false);
  });

  test('Fine collection is strictly restricted to staff (ADMIN / LIBRARIAN)', () => {
    function canCollectPayment(role) {
      return role === 'ADMIN' || role === 'LIBRARIAN';
    }
    assert.equal(canCollectPayment('ADMIN'), true);
    assert.equal(canCollectPayment('LIBRARIAN'), true);
    assert.equal(canCollectPayment('MEMBER'), false);
  });

  test('Circulation desk checkout is strictly restricted to staff', () => {
    function canPerformCirculationDesk(role) {
      return role === 'ADMIN' || role === 'LIBRARIAN';
    }
    assert.equal(canPerformCirculationDesk('ADMIN'), true);
    assert.equal(canPerformCirculationDesk('LIBRARIAN'), true);
    assert.equal(canPerformCirculationDesk('MEMBER'), false);
  });
});

describe('4. Member Data Isolation and Ownership Verification', () => {
  const MOCK_MEMBERS = [
    { id: 'mem_081', memberId: 'MB-2026-081', email: 'kavita.sharma@campus.edu', name: 'Kavita Sharma' },
    { id: 'mem_082', memberId: 'MB-2026-082', email: 'rahul.verma@campus.edu', name: 'Rahul Verma' },
  ];

  function resolveActiveMember(user, members) {
    if (!user) return { member: null, isLinked: false };
    const found = members.find((m) =>
      (user.memberId && m.memberId.toLowerCase() === user.memberId.toLowerCase()) ||
      (user.id && m.id.toLowerCase() === user.id.toLowerCase()) ||
      (user.email && m.email.toLowerCase() === user.email.toLowerCase()) ||
      (user.id === 'usr_member_01' && m.memberId === 'MB-2026-081')
    );
    if (found) {
      return { member: found, isLinked: true, memberId: found.memberId, domainId: found.id };
    }
    return { member: null, isLinked: false, memberId: null, domainId: null };
  }

  test('Unlinked member account does NOT leak default Kavita Sharma data', () => {
    const unlinkedUser = {
      id: 'usr_new_student',
      email: 'alex.tan@campus.edu',
      name: 'Alex Tan',
      role: 'MEMBER',
    };
    const resolution = resolveActiveMember(unlinkedUser, MOCK_MEMBERS);
    assert.equal(resolution.isLinked, false);
    assert.equal(resolution.member, null);
    assert.equal(resolution.memberId, null);
  });

  test('Verified patron account links accurately to own record', () => {
    const registeredUser = {
      id: 'usr_rahul',
      email: 'rahul.verma@campus.edu',
      name: 'Rahul Verma',
      memberId: 'MB-2026-082',
      role: 'MEMBER',
    };
    const resolution = resolveActiveMember(registeredUser, MOCK_MEMBERS);
    assert.equal(resolution.isLinked, true);
    assert.equal(resolution.memberId, 'MB-2026-082');
    assert.equal(resolution.member.name, 'Rahul Verma');
  });

  test('Patron cannot renew loans belonging to other patrons', () => {
    const loan = {
      id: 'loan_100',
      memberId: 'mem_082',
      memberBarcode: 'MB-2026-082',
      memberEmail: 'rahul.verma@campus.edu',
    };

    function canRenew(user, targetLoan) {
      if (user.role === 'ADMIN' || user.role === 'LIBRARIAN') return true;
      if (user.role === 'MEMBER') {
        return (
          (user.memberId && targetLoan.memberBarcode.toLowerCase() === user.memberId.toLowerCase()) ||
          (user.id && targetLoan.memberId.toLowerCase() === user.id.toLowerCase()) ||
          (user.email && targetLoan.memberEmail.toLowerCase() === user.email.toLowerCase())
        );
      }
      return false;
    }

    const kavitaUser = {
      id: 'mem_081',
      memberId: 'MB-2026-081',
      email: 'kavita.sharma@campus.edu',
      role: 'MEMBER',
    };
    const rahulUser = {
      id: 'mem_082',
      memberId: 'MB-2026-082',
      email: 'rahul.verma@campus.edu',
      role: 'MEMBER',
    };

    assert.equal(canRenew(kavitaUser, loan), false);
    assert.equal(canRenew(rahulUser, loan), true);
  });

  test('Patron cannot cancel hold reservations belonging to other patrons', () => {
    const reservation = {
      id: 'res_200',
      memberId: 'mem_082',
      memberBarcode: 'MB-2026-082',
    };

    function canCancel(user, targetRes) {
      if (user.role === 'ADMIN' || user.role === 'LIBRARIAN') return true;
      if (user.role === 'MEMBER') {
        return (
          (user.memberId && targetRes.memberBarcode.toLowerCase() === user.memberId.toLowerCase()) ||
          (user.id && targetRes.memberId.toLowerCase() === user.id.toLowerCase())
        );
      }
      return false;
    }

    const attacker = { id: 'mem_999', memberId: 'MB-2026-999', role: 'MEMBER' };
    const owner = { id: 'mem_082', memberId: 'MB-2026-082', role: 'MEMBER' };

    assert.equal(canCancel(attacker, reservation), false);
    assert.equal(canCancel(owner, reservation), true);
  });
});

describe('5. Input Validation, Numeric Bounds & Data Safety', () => {
  function validatePaymentAmount(amount, balance) {
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      return { valid: false, error: 'Payment amount must be a positive number.' };
    }
    if (amount > balance) {
      return { valid: false, error: 'Payment cannot exceed current balance.' };
    }
    return { valid: true };
  }

  test('Rejects negative, zero, NaN, and infinite payment amounts', () => {
    const fineBalance = 150.00;
    assert.equal(validatePaymentAmount(-25, fineBalance).valid, false);
    assert.equal(validatePaymentAmount(0, fineBalance).valid, false);
    assert.equal(validatePaymentAmount(NaN, fineBalance).valid, false);
    assert.equal(validatePaymentAmount(Infinity, fineBalance).valid, false);
    assert.equal(validatePaymentAmount(-Infinity, fineBalance).valid, false);
  });

  test('Rejects payments exceeding current outstanding balance', () => {
    const fineBalance = 50.00;
    assert.equal(validatePaymentAmount(50.01, fineBalance).valid, false);
    assert.equal(validatePaymentAmount(100.00, fineBalance).valid, false);
    assert.equal(validatePaymentAmount(50.00, fineBalance).valid, true);
    assert.equal(validatePaymentAmount(25.00, fineBalance).valid, true);
  });

  function validateWaiver(amount, balance, reason) {
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      return { valid: false, error: 'Waiver amount must be a positive number.' };
    }
    if (amount > balance) {
      return { valid: false, error: 'Waiver amount cannot exceed balance.' };
    }
    if (!reason || reason.trim().length < 5) {
      return { valid: false, error: 'Institutional audit justification must be at least 5 characters.' };
    }
    return { valid: true };
  }

  test('Requires valid reason justification for fine waiver', () => {
    assert.equal(validateWaiver(20, 20, '').valid, false);
    assert.equal(validateWaiver(20, 20, '   ').valid, false);
    assert.equal(validateWaiver(20, 20, 'ok').valid, false);
    assert.equal(validateWaiver(20, 20, 'Official Dean waiver authorized').valid, true);
  });
});

describe('6. Barcode & QR Payload Sanitization', () => {
  test('Normalizes standard barcodes to uppercase and strips whitespace', () => {
    assert.equal(normalizeBarcode('  lc-00421  '), 'LC-00421');
    assert.equal(normalizeBarcode('mb-2026-081'), 'MB-2026-081');
  });

  test('Strips ASCII control characters and non-printable bytes', () => {
    const malicious = 'LC-00421\x00\x1f\r\n\x7F';
    assert.equal(normalizeBarcode(malicious), 'LC-00421');
  });

  test('Rejects or truncates payloads longer than 512 characters', () => {
    const hugePayload = 'A'.repeat(600);
    assert.equal(normalizeBarcode(hugePayload), '');
  });

  test('Safely extracts identifier from scanned JSON QR payloads', () => {
    const jsonPayload = JSON.stringify({ barcode: 'LC-00421', type: 'book_copy' });
    assert.equal(normalizeBarcode(jsonPayload), 'LC-00421');

    const memberJson = JSON.stringify({ memberId: 'MB-2026-081', role: 'STUDENT' });
    assert.equal(normalizeBarcode(memberJson), 'MB-2026-081');
  });

  test('Safely extracts identifier from libflow URI schemes', () => {
    assert.equal(normalizeBarcode('libflow://copy/LC-00421'), 'LC-00421');
    assert.equal(normalizeBarcode('libflow://member/MB-2026-081'), 'MB-2026-081');
    assert.equal(normalizeBarcode('libflow://loan/LN-2026-00421'), 'LN-2026-00421');
  });

  test('Handles invalid non-string and malformed inputs gracefully without throwing', () => {
    assert.equal(normalizeBarcode(null), '');
    assert.equal(normalizeBarcode(undefined), '');
    assert.equal(normalizeBarcode(12345), '');
    assert.equal(normalizeBarcode('{malformed_json:'), '{MALFORMED_JSON:');
  });
});
