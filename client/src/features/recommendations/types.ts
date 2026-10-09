/**
 * LIBFLOW — Recommendation Engine Domain Type Definitions
 * 
 * CORE ARCHITECTURAL PRINCIPLE:
 * - Deterministic, rule-based academic library recommendation system.
 * - Derived exclusively from actual circulation history, catalog categories, authors, and availability.
 * - Zero artificial/black-box claims; completely transparent and explainable.
 */

import type { Book } from '../books/types';

export type RecommendationReasonType =
  | 'BASED_ON_LOAN'
  | 'RELATED_CATEGORY'
  | 'RELATED_AUTHOR'
  | 'POPULAR_IN_DEPARTMENT'
  | 'AVAILABLE_NOW'
  | 'CURRICULUM_ESSENTIAL';

export interface ScoreBreakdown {
  categoryMatch: number;
  authorMatch: number;
  departmentRelevance: number;
  availabilityBonus: number;
  popularityFactor: number;
}

export interface Recommendation {
  id: string;
  memberId: string;
  bookId: string;
  book: Book;
  score: number; // 0..100
  reasonType: RecommendationReasonType;
  reasonTitle: string; // e.g. "Because you read Clean Code"
  reasonDescription: string; // e.g. "Robert C. Martin's craftsmanship handbook pairs directly with software design principles."
  departmentContext?: string; // e.g. "Trending in Computer Science"
  scoreBreakdown: ScoreBreakdown;
  availableCopies: number;
  isAvailable: boolean;
  dismissed: boolean;
  generatedAt: string;
}

export interface GroupedRecommendationSource {
  sourceBookTitle: string;
  sourceBookId: string;
  recommendations: Recommendation[];
}

export interface RecommendationFeed {
  forYou: Recommendation[];
  becauseYouRead: GroupedRecommendationSource[];
  departmentTrending: Recommendation[];
  availableNow: Recommendation[];
  hasHistory: boolean;
  totalRecommendations: number;
}
