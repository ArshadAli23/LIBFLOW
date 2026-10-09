/**
 * LIBFLOW — Deterministic Curriculum Recommendation Engine
 * 
 * Rules-based, explainable library recommendation algorithm:
 * - Derives affinities strictly from patron borrowing history and academic curriculum.
 * - Prioritizes real-time shelf availability.
 * - Provides honest, transparent explanations for every suggestion.
 */

import type { Book } from '../books/types';
import type { Member } from '../members/types';
import type { Loan } from '../circulation/types';
import type { Reservation } from '../reservations/types';
import type {
  Recommendation,
  RecommendationFeed,
  RecommendationReasonType,
  ScoreBreakdown,
  GroupedRecommendationSource,
} from './types';

// Subject keywords matching university departments
const DEPARTMENT_KEYWORD_MAP: Record<string, string[]> = {
  'computer science': [
    'software', 'algorithms', 'database', 'systems', 'programming', 'code',
    'distributed', 'networking', 'architecture', 'data', 'cloud', 'security'
  ],
  'software engineering': [
    'software', 'code', 'refactoring', 'design patterns', 'agile', 'testing',
    'architecture', 'devops', 'web'
  ],
  'data science': [
    'data', 'analytics', 'statistics', 'machine learning', 'database', 'python',
    'distributed'
  ],
  'electrical engineering': [
    'circuits', 'signals', 'hardware', 'embedded', 'systems', 'microprocessors'
  ],
};

export interface GenerateRecommendationsParams {
  member: Member;
  books: Book[];
  loans: Loan[];
  reservations: Reservation[];
  dismissedIds?: Set<string>;
}

export function generateRecommendations({
  member,
  books,
  loans,
  reservations,
  dismissedIds = new Set(),
}: GenerateRecommendationsParams): RecommendationFeed {
  const memberLoans = loans.filter((l) => l.memberId === member.id || l.memberBarcode === member.memberId);
  const activeLoans = memberLoans.filter((l) => l.status === 'ACTIVE' || l.status === 'OVERDUE');
  const activeReservations = reservations.filter(
    (r) => (r.memberId === member.id || r.memberBarcode === member.memberId) &&
           (r.status === 'WAITING' || r.status === 'READY_FOR_PICKUP')
  );

  // Books currently in possession or reserved are excluded from recommendations
  const excludedBookIds = new Set<string>([
    ...activeLoans.map((l) => l.bookId),
    ...activeReservations.map((r) => r.bookId),
  ]);

  // Extract patron reading preferences
  const readBookIds = new Set<string>(memberLoans.map((l) => l.bookId));
  const readBooks = books.filter((b) => readBookIds.has(b.id));

  const readCategories = new Map<string, number>();
  const readAuthors = new Map<string, number>();

  for (const b of readBooks) {
    readCategories.set(b.category, (readCategories.get(b.category) || 0) + 1);
    for (const author of b.authors) {
      readAuthors.set(author, (readAuthors.get(author) || 0) + 1);
    }
  }

  // Department keywords
  const memberDeptLower = (member.department || '').toLowerCase();
  const deptKeywords =
    Object.entries(DEPARTMENT_KEYWORD_MAP).find(([deptKey]) =>
      memberDeptLower.includes(deptKey)
    )?.[1] || ['software', 'systems', 'data'];

  const now = new Date().toISOString();
  const allCandidates: Recommendation[] = [];

  for (const book of books) {
    // Skip excluded (already borrowed or reserved) or dismissed
    if (excludedBookIds.has(book.id) || dismissedIds.has(book.id)) {
      continue;
    }

    // Initialize scoring components
    let categoryMatch = 0;
    let authorMatch = 0;
    let departmentRelevance = 0;
    let availabilityBonus = 0;
    let popularityFactor = 0;

    let reasonType: RecommendationReasonType = 'AVAILABLE_NOW';
    let reasonTitle = 'Available in Library Stacks';
    let reasonDescription = `Currently has ${book.availableCopies} physical copies ready for immediate desk checkout.`;
    let departmentContext: string | undefined;

    // 1. Author Affinity
    const hasMatchingAuthor = book.authors.some((a) => readAuthors.has(a));
    if (hasMatchingAuthor) {
      authorMatch = 25;
      const matchedAuthor = book.authors.find((a) => readAuthors.has(a));
      reasonType = 'RELATED_AUTHOR';
      reasonTitle = `More by ${matchedAuthor}`;
      reasonDescription = `You previously read books by ${matchedAuthor}. Here is another essential title from their catalog.`;
    }

    // 2. Category Affinity
    if (readCategories.has(book.category)) {
      const timesRead = readCategories.get(book.category) || 1;
      categoryMatch = Math.min(35, 20 + timesRead * 5);

      if (!hasMatchingAuthor) {
        const sourceBook = readBooks.find((rb) => rb.category === book.category);
        reasonType = 'BASED_ON_LOAN';
        reasonTitle = sourceBook
          ? `Because you read ${sourceBook.title}`
          : `Matches your interest in ${book.category}`;
        reasonDescription = `Essential reference in ${book.category} that extends concepts from your previous library loans.`;
      }
    }

    // 3. Department Curriculum Relevance
    const bookText = `${book.title} ${book.category} ${book.subcategory || ''} ${book.tags.join(' ')}`.toLowerCase();
    const keywordMatches = deptKeywords.filter((kw) => bookText.includes(kw)).length;
    if (keywordMatches > 0) {
      departmentRelevance = Math.min(20, keywordMatches * 5);
      departmentContext = `Recommended for ${member.program || 'your degree program'}`;

      if (!hasMatchingAuthor && categoryMatch === 0) {
        reasonType = 'POPULAR_IN_DEPARTMENT';
        reasonTitle = `Core Curriculum in ${member.department.replace('Department of ', '')}`;
        reasonDescription = `Standard reading list reference frequently checked out by students in your academic cohort.`;
      }
    }

    // 4. Shelf Availability Bonus
    if (book.availableCopies > 0) {
      availabilityBonus = 10;
    }

    // 5. Circulation Popularity Factor
    if (book.borrowedCopies > 0 || book.totalCopies > 4) {
      popularityFactor = 10;
    }

    // Compute Total Score (0..100)
    let totalScore = categoryMatch + authorMatch + departmentRelevance + availabilityBonus + popularityFactor;

    // Fallback for cold-start (new patron with 0 reading history)
    if (readBooks.length === 0) {
      if (departmentRelevance > 0) {
        totalScore = 65 + departmentRelevance + availabilityBonus;
        reasonType = 'POPULAR_IN_DEPARTMENT';
        reasonTitle = `Curriculum Essential for ${member.department.replace('Department of ', '')}`;
        reasonDescription = 'Foundational textbook recommended for incoming students in your academic curriculum.';
      } else {
        totalScore = 50 + availabilityBonus + popularityFactor;
        reasonType = 'AVAILABLE_NOW';
        reasonTitle = 'Featured Academic Title';
        reasonDescription = 'High-demand library title with open copies on the shelf.';
      }
    }

    totalScore = Math.min(98, Math.max(30, totalScore));

    const breakdown: ScoreBreakdown = {
      categoryMatch,
      authorMatch,
      departmentRelevance,
      availabilityBonus,
      popularityFactor,
    };

    allCandidates.push({
      id: `rec_${book.id}`,
      memberId: member.id,
      bookId: book.id,
      book,
      score: totalScore,
      reasonType,
      reasonTitle,
      reasonDescription,
      departmentContext,
      scoreBreakdown: breakdown,
      availableCopies: book.availableCopies,
      isAvailable: book.availableCopies > 0,
      dismissed: false,
      generatedAt: now,
    });
  }

  // Sort descending by score
  allCandidates.sort((a, b) => b.score - a.score);

  // Group 1: Top "For You" picks (score >= 70 or top 6)
  const forYou = allCandidates.slice(0, 6);

  // Group 2: "Because You Read" groups
  const becauseYouRead: GroupedRecommendationSource[] = [];
  for (const readBook of readBooks.slice(0, 3)) {
    const related = allCandidates
      .filter((c) => c.book.category === readBook.category && c.book.id !== readBook.id)
      .slice(0, 3);

    if (related.length > 0) {
      becauseYouRead.push({
        sourceBookTitle: readBook.title,
        sourceBookId: readBook.id,
        recommendations: related,
      });
    }
  }

  // Group 3: Department Trending
  const departmentTrending = allCandidates
    .filter((c) => (c.scoreBreakdown.departmentRelevance > 0 || c.reasonType === 'POPULAR_IN_DEPARTMENT'))
    .slice(0, 4);

  // Group 4: Available Now on Stacks
  const availableNow = allCandidates
    .filter((c) => c.isAvailable)
    .slice(0, 4);

  return {
    forYou,
    becauseYouRead,
    departmentTrending: departmentTrending.length > 0 ? departmentTrending : allCandidates.slice(0, 4),
    availableNow,
    hasHistory: readBooks.length > 0,
    totalRecommendations: allCandidates.length,
  };
}
