/**
 * LIBFLOW — Recommendation Domain Selectors & Formatting Helpers
 */

import type { RecommendationReasonType } from './types';

export function getReasonBadgeConfig(reasonType: RecommendationReasonType): {
  label: string;
  badgeClass: string;
  iconName: 'book-open' | 'layers' | 'user' | 'graduation-cap' | 'check-circle' | 'sparkles';
} {
  switch (reasonType) {
    case 'BASED_ON_LOAN':
      return {
        label: 'Reading History',
        badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
        iconName: 'book-open',
      };
    case 'RELATED_AUTHOR':
      return {
        label: 'Author Match',
        badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
        iconName: 'user',
      };
    case 'RELATED_CATEGORY':
      return {
        label: 'Topic Match',
        badgeClass: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
        iconName: 'layers',
      };
    case 'POPULAR_IN_DEPARTMENT':
      return {
        label: 'Curriculum Core',
        badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
        iconName: 'graduation-cap',
      };
    case 'AVAILABLE_NOW':
      return {
        label: 'Ready on Shelf',
        badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
        iconName: 'check-circle',
      };
    case 'CURRICULUM_ESSENTIAL':
    default:
      return {
        label: 'Curated',
        badgeClass: 'bg-stone-500/10 text-stone-700 dark:text-stone-300 border-stone-500/20',
        iconName: 'sparkles',
      };
  }
}

export function formatMatchScore(score: number): string {
  return `${Math.round(score)}% match`;
}

export function getScoreGrade(score: number): {
  label: string;
  colorClass: string;
} {
  if (score >= 90) return { label: 'Strongest Match', colorClass: 'text-emerald-600 dark:text-emerald-400' };
  if (score >= 75) return { label: 'High Affinity', colorClass: 'text-teal-600 dark:text-teal-400' };
  if (score >= 60) return { label: 'Moderate Match', colorClass: 'text-blue-600 dark:text-blue-400' };
  return { label: 'Recommended', colorClass: 'text-stone-600 dark:text-stone-400' };
}
