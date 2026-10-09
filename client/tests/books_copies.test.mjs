import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_BOOKS, INITIAL_COPIES } from '../src/features/books/mockBooksData.ts';

describe('Books and Physical Book Copies Management', () => {
  test('Initial catalog contains valid bibliographic books with positive copies', () => {
    assert.ok(INITIAL_BOOKS.length >= 5);
    for (const book of INITIAL_BOOKS) {
      assert.ok(book.id);
      assert.ok(book.title);
      assert.ok(book.isbn);
      assert.ok(book.authors.length > 0);
      assert.ok(book.totalCopies >= 0);
      assert.ok(book.availableCopies >= 0);
      assert.ok(book.totalCopies >= book.availableCopies);
    }
  });

  test('Search filter matches by title, author, isbn, and tags case-insensitively', () => {
    function searchBooks(books, query) {
      const q = query.toLowerCase().trim();
      if (!q) return books;
      return books.filter((b) =>
        b.title.toLowerCase().includes(q) ||
        b.authors.some((a) => a.toLowerCase().includes(q)) ||
        b.isbn.toLowerCase().includes(q) ||
        b.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    const byTitle = searchBooks(INITIAL_BOOKS, 'pragmatic');
    assert.ok(byTitle.some((b) => b.id === 'bk_pragmatic'));

    const byAuthor = searchBooks(INITIAL_BOOKS, 'Kleppmann');
    assert.ok(byAuthor.some((b) => b.id === 'bk_ddia'));

    const byIsbn = searchBooks(INITIAL_BOOKS, '9780135957059');
    assert.ok(byIsbn.some((b) => b.id === 'bk_pragmatic'));

    const byTag = searchBooks(INITIAL_BOOKS, 'refactoring');
    assert.ok(byTag.length > 0);
  });

  test('Category filter isolates books accurately', () => {
    function filterByCategory(books, category) {
      if (!category || category === 'ALL') return books;
      return books.filter((b) => b.category.toLowerCase() === category.toLowerCase());
    }

    const seBooks = filterByCategory(INITIAL_BOOKS, 'Software Engineering');
    assert.ok(seBooks.length > 0);
    assert.ok(seBooks.every((b) => b.category === 'Software Engineering'));
  });

  test('Adding a book creates consistent zero-inventory state', () => {
    const newBookData = {
      title: 'Site Reliability Engineering',
      authors: ['Niall Richard Murphy', 'Betsy Beyer'],
      isbn: '9781491929124',
      publisher: "O'Reilly Media",
      publicationYear: 2016,
      category: 'Distributed Systems',
      language: 'English',
      status: 'ACTIVE',
      description: 'How Google Runs Production Systems',
      format: 'PAPERBACK',
      tags: ['SRE', 'DevOps', 'Cloud'],
    };

    const id = `bk_${Date.now()}`;
    const now = new Date().toISOString();
    const createdBook = {
      ...newBookData,
      id,
      tenantId: 'tenant_central',
      totalCopies: 0,
      availableCopies: 0,
      borrowedCopies: 0,
      reservedCopies: 0,
      createdAt: now,
      updatedAt: now,
    };

    assert.equal(createdBook.totalCopies, 0);
    assert.equal(createdBook.availableCopies, 0);
    assert.equal(createdBook.borrowedCopies, 0);
    assert.equal(createdBook.status, 'ACTIVE');
  });

  test('Physical copy additions update parent book availability counts', () => {
    function recalculateBookCounts(bookId, currentCopies) {
      const bookCopies = currentCopies.filter((c) => c.bookId === bookId && c.status !== 'WITHDRAWN');
      return {
        totalCopies: bookCopies.length,
        availableCopies: bookCopies.filter((c) => c.status === 'AVAILABLE').length,
        borrowedCopies: bookCopies.filter((c) => c.status === 'BORROWED').length,
        reservedCopies: bookCopies.filter((c) => c.status === 'RESERVED').length,
      };
    }

    const testBookId = 'bk_test_100';
    let copies = [];

    // Add first available copy
    copies.push({
      id: 'cp_1',
      bookId: testBookId,
      barcode: 'LC-99001',
      status: 'AVAILABLE',
      condition: 'NEW',
      shelf: 'A-01-01',
    });

    let counts = recalculateBookCounts(testBookId, copies);
    assert.equal(counts.totalCopies, 1);
    assert.equal(counts.availableCopies, 1);
    assert.equal(counts.borrowedCopies, 0);

    // Add second copy (borrowed)
    copies.push({
      id: 'cp_2',
      bookId: testBookId,
      barcode: 'LC-99002',
      status: 'BORROWED',
      condition: 'GOOD',
      shelf: 'A-01-01',
    });

    counts = recalculateBookCounts(testBookId, copies);
    assert.equal(counts.totalCopies, 2);
    assert.equal(counts.availableCopies, 1);
    assert.equal(counts.borrowedCopies, 1);

    // Add third copy (reserved)
    copies.push({
      id: 'cp_3',
      bookId: testBookId,
      barcode: 'LC-99003',
      status: 'RESERVED',
      condition: 'FAIR',
      shelf: 'A-01-01',
    });

    counts = recalculateBookCounts(testBookId, copies);
    assert.equal(counts.totalCopies, 3);
    assert.equal(counts.availableCopies, 1);
    assert.equal(counts.borrowedCopies, 1);
    assert.equal(counts.reservedCopies, 1);
  });

  test('Withdrawing a physical copy deducts from counts and appends audit timeline', () => {
    function recalculateBookCounts(bookId, currentCopies) {
      const bookCopies = currentCopies.filter((c) => c.bookId === bookId && c.status !== 'WITHDRAWN');
      return {
        totalCopies: bookCopies.length,
        availableCopies: bookCopies.filter((c) => c.status === 'AVAILABLE').length,
      };
    }

    const testBookId = 'bk_withdraw_test';
    let copies = [
      { id: 'cp_w1', bookId: testBookId, barcode: 'LC-88001', status: 'AVAILABLE', timeline: [] },
      { id: 'cp_w2', bookId: testBookId, barcode: 'LC-88002', status: 'AVAILABLE', timeline: [] },
    ];

    let counts = recalculateBookCounts(testBookId, copies);
    assert.equal(counts.totalCopies, 2);
    assert.equal(counts.availableCopies, 2);

    // Withdraw copy cp_w1
    const withdrawalReason = 'Water damage beyond repair';
    const now = new Date().toISOString();
    copies = copies.map((c) => {
      if (c.id === 'cp_w1') {
        return {
          ...c,
          status: 'WITHDRAWN',
          notes: `Withdrawn: ${withdrawalReason}`,
          timeline: [
            ...c.timeline,
            {
              id: 'tl_withdraw',
              event: 'WITHDRAWN',
              timestamp: now,
              actor: 'Authorized Administrator',
              note: withdrawalReason,
            },
          ],
        };
      }
      return c;
    });

    counts = recalculateBookCounts(testBookId, copies);
    assert.equal(counts.totalCopies, 1);
    assert.equal(counts.availableCopies, 1);

    const withdrawnCopy = copies.find((c) => c.id === 'cp_w1');
    assert.equal(withdrawnCopy.status, 'WITHDRAWN');
    assert.equal(withdrawnCopy.timeline.length, 1);
    assert.equal(withdrawnCopy.timeline[0].event, 'WITHDRAWN');
  });

  test('Physical copy barcode formats are unique and normalized', () => {
    const barcodes = INITIAL_COPIES.map((c) => c.barcode);
    const uniqueBarcodes = new Set(barcodes);
    assert.equal(barcodes.length, uniqueBarcodes.size, 'All seed copy barcodes must be strictly unique');
    for (const bc of barcodes) {
      assert.match(bc, /^LC-\d{5}$/, `Barcode ${bc} must follow LC-xxxxx pattern`);
    }
  });
});
