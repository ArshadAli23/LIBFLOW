/**
 * LIBFLOW — Recommendation Empty & Cold-Start States
 */

import React from 'react';
import { Button } from '../../../components/ui/Button';
import { BookOpen, Sparkles, RotateCcw } from 'lucide-react';

export interface RecommendationEmptyStateProps {
  type: 'COLD_START' | 'ALL_DISMISSED' | 'NO_MATCHES';
  onRestoreAll?: () => void;
  onNavigate?: (path: string) => void;
  className?: string;
}

export const RecommendationEmptyState: React.FC<RecommendationEmptyStateProps> = ({
  type,
  onRestoreAll,
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

  if (type === 'ALL_DISMISSED') {
    return (
      <div
        className={`p-10 rounded-2xl border border-dashed border-stone-300 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/30 text-center space-y-4 ${className}`}
      >
        <div className="w-12 h-12 rounded-full bg-stone-200/60 dark:bg-stone-800 text-stone-600 dark:text-stone-300 flex items-center justify-center mx-auto">
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="max-w-md mx-auto space-y-1">
          <h3 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100">
            You're all caught up
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
            You have dismissed the current batch of recommended books. New titles will be
            suggested automatically when fresh accessions arrive or your loan activity changes.
          </p>
        </div>
        {onRestoreAll && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRestoreAll}
            className="inline-flex items-center gap-2 text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restore Dismissed Recommendations
          </Button>
        )}
      </div>
    );
  }

  if (type === 'COLD_START') {
    return (
      <div
        className={`p-8 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/40 text-center space-y-4 ${className}`}
      >
        <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto">
          <BookOpen className="w-6 h-6" />
        </div>
        <div className="max-w-md mx-auto space-y-1">
          <h3 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100">
            Start building your reading profile
          </h3>
          <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
            Your recommendations will sharpen as you borrow books and explore collections.
            Below are popular curriculum essentials curated for your academic department.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleNavigate('member/library/books')}
          className="text-xs"
        >
          Browse Full Catalog
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`p-10 rounded-2xl border border-dashed border-stone-300 dark:border-stone-800 text-center space-y-2 ${className}`}
    >
      <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200">
        No recommendations in this section
      </h3>
      <p className="text-xs text-stone-500">
        Check other discovery categories or browse the full collection.
      </p>
    </div>
  );
};
