/**
 * LIBFLOW — "Why This Book?" Explainable Algorithm Inspection Modal
 * 
 * CORE UX PRINCIPLE:
 * Complete transparency. The patron can inspect the deterministic score factors,
 * catalog associations, and academic relevance without mystery black boxes or fake AI claims.
 */

import React from 'react';
import type { Recommendation } from '../types';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { BookCover } from '../../books/components/BookCover';
import { getReasonBadgeConfig, formatMatchScore } from '../recommendationSelectors';
import { Info, Sparkles, BookOpen, User, Building2, CheckCircle2, TrendingUp } from 'lucide-react';

export interface WhyThisBookModalProps {
  recommendation: Recommendation | null;
  isOpen: boolean;
  onClose: () => void;
  onReserve?: (recommendation: Recommendation) => void;
  onNavigate?: (path: string) => void;
}

export const WhyThisBookModal: React.FC<WhyThisBookModalProps> = ({
  recommendation,
  isOpen,
  onClose,
  onReserve,
  onNavigate,
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

  if (!recommendation) return null;

  const { book, score, reasonTitle, reasonDescription, scoreBreakdown, isAvailable, availableCopies } =
    recommendation;
  const badgeConfig = getReasonBadgeConfig(recommendation.reasonType);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Recommendation Rationale" size="lg">
      <div className="space-y-6">
        {/* Book Header Summary */}
        <div className="flex flex-col sm:flex-row items-start gap-4 p-4 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800">
          <BookCover
            title={book.title}
            author={book.authors[0]}
            category={book.category}
            coverUrl={book.coverUrl}
            size="md"
            className="shrink-0 shadow-sm"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeConfig.badgeClass}`}
              >
                <Sparkles className="w-3 h-3" />
                {badgeConfig.label}
              </span>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                {formatMatchScore(score)}
              </span>
            </div>

            <h3 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100 leading-snug">
              {book.title}
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
              by {book.authors.join(', ')} • {book.publicationYear || 'Recent'}
            </p>

            <div className="flex items-center gap-2 mt-2 text-xs">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  isAvailable ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <span className="font-medium text-stone-700 dark:text-stone-300">
                {isAvailable
                  ? `${availableCopies} of ${book.totalCopies} copies available in stacks`
                  : 'All copies currently on loan'}
              </span>
            </div>
          </div>
        </div>

        {/* Primary Explanation Statement */}
        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 shrink-0">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                {reasonTitle}
              </h4>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">
                {reasonDescription}
              </p>
            </div>
          </div>
        </div>

        {/* Deterministic Scoring Formula Breakdown */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3">
            Algorithmic Affinity Factors
          </h4>
          <div className="space-y-2.5">
            {/* Category */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-xs">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <div className="font-medium text-stone-800 dark:text-stone-200">
                    Subject & Category Match ({book.category})
                  </div>
                  <div className="text-[11px] text-stone-500">
                    Aligns with subjects from your historical circulation activity
                  </div>
                </div>
              </div>
              <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                +{scoreBreakdown.categoryMatch} pts
              </span>
            </div>

            {/* Author */}
            {scoreBreakdown.authorMatch > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-xs">
                <div className="flex items-center gap-2.5">
                  <User className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <div>
                    <div className="font-medium text-stone-800 dark:text-stone-200">
                      Author Affinity
                    </div>
                    <div className="text-[11px] text-stone-500">
                      You previously checked out works by {book.authors[0]}
                    </div>
                  </div>
                </div>
                <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                  +{scoreBreakdown.authorMatch} pts
                </span>
              </div>
            )}

            {/* Department / Curriculum */}
            {scoreBreakdown.departmentRelevance > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-xs">
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <div>
                    <div className="font-medium text-stone-800 dark:text-stone-200">
                      Academic Department Curriculum
                    </div>
                    <div className="text-[11px] text-stone-500">
                      Frequent reference text for your degree program cohort
                    </div>
                  </div>
                </div>
                <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                  +{scoreBreakdown.departmentRelevance} pts
                </span>
              </div>
            )}

            {/* Availability */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2
                  className={`w-4 h-4 ${
                    scoreBreakdown.availabilityBonus > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-stone-400'
                  }`}
                />
                <div>
                  <div className="font-medium text-stone-800 dark:text-stone-200">
                    Physical Stacks Availability
                  </div>
                  <div className="text-[11px] text-stone-500">
                    {scoreBreakdown.availabilityBonus > 0
                      ? 'Bonus applied because copies are immediately accessible'
                      : 'No availability bonus (all copies checked out)'}
                  </div>
                </div>
              </div>
              <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                +{scoreBreakdown.availabilityBonus} pts
              </span>
            </div>

            {/* Popularity */}
            {scoreBreakdown.popularityFactor > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-xs">
                <div className="flex items-center gap-2.5">
                  <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <div>
                    <div className="font-medium text-stone-800 dark:text-stone-200">
                      Circulation Velocity
                    </div>
                    <div className="text-[11px] text-stone-500">
                      Consistently checked out across campus libraries
                    </div>
                  </div>
                </div>
                <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                  +{scoreBreakdown.popularityFactor} pts
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Explainability & Privacy Notice */}
        <div className="p-3 rounded-lg bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
          <strong>Privacy & Transparency Guarantee:</strong> LIBFLOW recommendations are computed
          strictly on client device from your library borrow ledger and official catalog metadata.
          We never deploy generative black-box profiling or sell patron reading records.
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onClose();
              handleNavigate(`books/${book.id}`);
            }}
          >
            View Book Page
          </Button>
          {onReserve && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onClose();
                onReserve(recommendation);
              }}
            >
              Reserve Hold
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
