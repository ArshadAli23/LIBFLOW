/**
 * LIBFLOW — Editorial Book Recommendation Card
 * 
 * CORE UX & DESIGN:
 * "Library Editorial + Modern Campus App"
 * High typographic polish, subtle hover elevation, clear physical shelf availability indicator,
 * explainable score badge, and one-click reserve / dismissal actions.
 */

import React from 'react';
import type { Recommendation } from '../types';
import { BookCover } from '../../books/components/BookCover';
import { Button } from '../../../components/ui/Button';
import { getReasonBadgeConfig, formatMatchScore } from '../recommendationSelectors';
import { Sparkles, HelpCircle, X, Bookmark, BookOpen } from 'lucide-react';

export interface RecommendationCardProps {
  recommendation: Recommendation;
  onInspect: (recommendation: Recommendation) => void;
  onReserve?: (recommendation: Recommendation) => void;
  onDismiss?: (recommendation: Recommendation) => void;
  onNavigate?: (path: string) => void;
  className?: string;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  onInspect,
  onReserve,
  onDismiss,
  onNavigate,
  className = '',
}) => {
  const handleNavigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      const clean = path.replace(/^\/+/, '');
      window.history.pushState(null, '', clean ? `/${clean}` : '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };
  const { book, score, reasonTitle, isAvailable, availableCopies } = recommendation;
  const badgeConfig = getReasonBadgeConfig(recommendation.reasonType);

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-stone-300 dark:hover:border-stone-700 ${className}`}
    >
      {/* Top Banner: Dismiss button & Match Pill */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <button
          type="button"
          onClick={() => onInspect(recommendation)}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors cursor-pointer"
          title="Click to view why this book was recommended"
        >
          <span>{formatMatchScore(score)}</span>
          <HelpCircle className="w-3 h-3 opacity-70" />
        </button>

        {onDismiss && (
          <button
            type="button"
            onClick={() => onDismiss(recommendation)}
            className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title="Dismiss this recommendation"
            aria-label={`Dismiss recommendation for ${book.title}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Main Content: Cover + Core Metadata */}
      <div className="flex items-start gap-3.5">
        <button
          type="button"
          onClick={() => handleNavigate(`books/${book.id}`)}
          className="shrink-0 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-amber-500 rounded-sm"
          title={`View catalog entry for ${book.title}`}
        >
          <BookCover
            title={book.title}
            author={book.authors[0]}
            category={book.category}
            coverUrl={book.coverUrl}
            size="md"
            className="shadow-sm group-hover:shadow transition-shadow"
          />
        </button>

        <div className="flex-1 min-w-0">
          {/* Reason Badge */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border mb-1.5 ${badgeConfig.badgeClass}`}
          >
            <Sparkles className="w-2.5 h-2.5" />
            {badgeConfig.label}
          </span>

          {/* Title */}
          <h4
            onClick={() => handleNavigate(`books/${book.id}`)}
            className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100 hover:text-amber-700 dark:hover:text-amber-400 transition-colors cursor-pointer line-clamp-2 leading-snug"
          >
            {book.title}
          </h4>

          {/* Authors */}
          <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5 line-clamp-1">
            {book.authors.join(', ')}
          </p>

          {/* Availability Indicator */}
          <div className="flex items-center gap-1.5 mt-2 text-xs">
            <span
              className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                isAvailable ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <span
              className={`text-[11px] font-medium ${
                isAvailable
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-amber-700 dark:text-amber-400'
              }`}
            >
              {isAvailable ? `${availableCopies} in stacks` : 'All on loan'}
            </span>
          </div>
        </div>
      </div>

      {/* Rationale Snippet */}
      <div className="mt-3.5 pt-3 border-t border-stone-100 dark:border-stone-800/80">
        <p className="text-[11px] text-stone-600 dark:text-stone-400 line-clamp-2 italic">
          "{reasonTitle}"
        </p>
      </div>

      {/* Action Row */}
      <div className="mt-3.5 flex items-center gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs h-9 justify-center gap-1"
          onClick={() => handleNavigate(`books/${book.id}`)}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Details</span>
        </Button>

        {onReserve && (
          <Button
            variant={isAvailable ? 'secondary' : 'primary'}
            size="sm"
            className="flex-1 text-xs h-9 justify-center gap-1"
            onClick={() => onReserve(recommendation)}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>{isAvailable ? 'Hold Copy' : 'Reserve'}</span>
          </Button>
        )}
      </div>
    </div>
  );
};
