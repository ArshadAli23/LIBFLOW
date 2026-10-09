/**
 * LIBFLOW — Member Recommendations & Academic Discovery Page
 * 
 * CORE FEATURES:
 * - Deterministic, curriculum-aligned reading recommendations.
 * - Categorized sections: "For You", "Because You Read...", "Department Curriculum", "Available in Stacks".
 * - "Why this book?" inspection modal breaking down deterministic affinity points.
 * - Direct integration with existing title reservation modal (`ReserveBookModal`).
 * - LocalStorage persistence for dismissed recommendations (`libflow_recommendations_v1`).
 * - Responsive layout honoring "Library Editorial + Modern Campus App" standards.
 */

import React, { useState } from 'react';
import { useRecommendations } from '../../features/recommendations/RecommendationsContext';
import { RecommendationCard } from '../../features/recommendations/components/RecommendationCard';
import { RecommendationSection } from '../../features/recommendations/components/RecommendationSection';
import { WhyThisBookModal } from '../../features/recommendations/components/WhyThisBookModal';
import { RecommendationEmptyState } from '../../features/recommendations/components/RecommendationEmptyState';
import { ReserveBookModal } from '../../features/reservations/components/ReserveBookModal';
import type { Recommendation } from '../../features/recommendations/types';
import type { Book } from '../../features/books/types';
import { useAuth } from '../../auth/AuthContext';
import { Sparkles, BookOpen, Layers, CheckCircle2, RotateCcw } from 'lucide-react';
import { Button } from '../../components/ui/Button';

type TabView = 'all' | 'forYou' | 'becauseYouRead' | 'department' | 'available';

export interface MemberRecommendationsPageProps {
  onNavigate?: (path: string) => void;
}

export const MemberRecommendationsPage: React.FC<MemberRecommendationsPageProps> = ({
  onNavigate,
}) => {
  const { user } = useAuth();
  const { feed, isLoading, dismissedCount, dismissRecommendation, restoreAllDismissed } =
    useRecommendations();

  // Active filter tab
  const [activeTab, setActiveTab] = useState<TabView>('all');

  // Modal inspection states
  const [inspectingRec, setInspectingRec] = useState<Recommendation | null>(null);
  const [reservingBook, setReservingBook] = useState<Book | null>(null);

  if (isLoading || !feed) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="h-8 w-64 bg-stone-200 dark:bg-stone-800 rounded animate-pulse" />
        <div className="h-4 w-96 bg-stone-100 dark:bg-stone-850 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-72 rounded-xl bg-stone-100 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  const { forYou, becauseYouRead, departmentTrending, availableNow, hasHistory, totalRecommendations } =
    feed;

  const departmentName = user?.department
    ? user.department.replace('Department of ', '')
    : 'Computer Science';

  // Handling reserve action
  const handleOpenReserve = (rec: Recommendation) => {
    setReservingBook(rec.book);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-stone-200 dark:border-stone-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Personalized Reading Discovery
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-stone-100 tracking-tight">
            Curated Recommendations
          </h1>
          <p className="text-sm text-stone-600 dark:text-stone-400 mt-1 max-w-2xl leading-relaxed">
            Curated from your circulation activity, academic course catalog, and real-time shelf
            availability in campus libraries.
          </p>
        </div>

        {/* Restore dismissals button if any */}
        {dismissedCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={restoreAllDismissed}
            className="self-start md:self-auto text-xs gap-1.5"
            title="Restore hidden suggestions"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restore {dismissedCount} Dismissed</span>
          </Button>
        )}
      </div>

      {/* Cold Start Notice if Patron has 0 borrow records */}
      {!hasHistory && (
        <RecommendationEmptyState type="COLD_START" onNavigate={onNavigate} className="mb-6" />
      )}

      {/* Tabs / Filter Nav */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-stone-200 dark:border-stone-800 text-xs">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-2 rounded-t-lg font-medium transition-colors whitespace-nowrap border-b-2 ${
            activeTab === 'all'
              ? 'border-amber-600 text-amber-700 dark:text-amber-400 bg-amber-500/5'
              : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
          }`}
        >
          All Recommendations ({totalRecommendations})
        </button>

        <button
          onClick={() => setActiveTab('forYou')}
          className={`px-3 py-2 rounded-t-lg font-medium transition-colors whitespace-nowrap border-b-2 ${
            activeTab === 'forYou'
              ? 'border-amber-600 text-amber-700 dark:text-amber-400 bg-amber-500/5'
              : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
          }`}
        >
          Top For You ({forYou.length})
        </button>

        {hasHistory && becauseYouRead.length > 0 && (
          <button
            onClick={() => setActiveTab('becauseYouRead')}
            className={`px-3 py-2 rounded-t-lg font-medium transition-colors whitespace-nowrap border-b-2 ${
              activeTab === 'becauseYouRead'
                ? 'border-amber-600 text-amber-700 dark:text-amber-400 bg-amber-500/5'
                : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            Because You Read ({becauseYouRead.reduce((acc, g) => acc + g.recommendations.length, 0)})
          </button>
        )}

        <button
          onClick={() => setActiveTab('department')}
          className={`px-3 py-2 rounded-t-lg font-medium transition-colors whitespace-nowrap border-b-2 ${
            activeTab === 'department'
              ? 'border-amber-600 text-amber-700 dark:text-amber-400 bg-amber-500/5'
              : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
          }`}
        >
          {departmentName} Curriculum ({departmentTrending.length})
        </button>

        <button
          onClick={() => setActiveTab('available')}
          className={`px-3 py-2 rounded-t-lg font-medium transition-colors whitespace-nowrap border-b-2 ${
            activeTab === 'available'
              ? 'border-amber-600 text-amber-700 dark:text-amber-400 bg-amber-500/5'
              : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
          }`}
        >
          Available Now ({availableNow.length})
        </button>
      </div>

      {/* Empty State if All Dismissed */}
      {totalRecommendations === 0 && (
        <RecommendationEmptyState
          type="ALL_DISMISSED"
          onRestoreAll={restoreAllDismissed}
        />
      )}

      {/* Main Content Sections */}
      {totalRecommendations > 0 && (
        <div className="space-y-10">
          {/* Section 1: For You */}
          {(activeTab === 'all' || activeTab === 'forYou') && forYou.length > 0 && (
            <RecommendationSection
              title="For You"
              subtitle="Highest affinity matches combining your recent loans and subject focus"
              badge="Top Picks"
              count={forYou.length}
              icon={<Sparkles className="w-5 h-5" />}
            >
              {forYou.map((rec) => (
                <RecommendationCard
                  key={rec.id}
                  recommendation={rec}
                  onInspect={setInspectingRec}
                  onReserve={handleOpenReserve}
                  onDismiss={(r) => dismissRecommendation(r.bookId)}
                />
              ))}
            </RecommendationSection>
          )}

          {/* Section 2: Because You Read... */}
          {(activeTab === 'all' || activeTab === 'becauseYouRead') &&
            becauseYouRead.map((group) => (
              <RecommendationSection
                key={group.sourceBookId}
                title={`Because You Read "${group.sourceBookTitle}"`}
                subtitle="Books in related subject areas and companion reading lists"
                badge="Loan Sequel"
                count={group.recommendations.length}
                icon={<BookOpen className="w-5 h-5" />}
              >
                {group.recommendations.map((rec) => (
                  <RecommendationCard
                    key={rec.id}
                    recommendation={rec}
                    onInspect={setInspectingRec}
                    onReserve={handleOpenReserve}
                    onDismiss={(r) => dismissRecommendation(r.bookId)}
                  />
                ))}
              </RecommendationSection>
            ))}

          {/* Section 3: Popular in Department / Curriculum */}
          {(activeTab === 'all' || activeTab === 'department') &&
            departmentTrending.length > 0 && (
              <RecommendationSection
                title={`Popular in ${departmentName}`}
                subtitle="Foundational textbooks and syllabi references frequently checked out by cohort peers"
                badge="Curriculum Core"
                count={departmentTrending.length}
                icon={<Layers className="w-5 h-5" />}
              >
                {departmentTrending.map((rec) => (
                  <RecommendationCard
                    key={rec.id}
                    recommendation={rec}
                    onInspect={setInspectingRec}
                    onReserve={handleOpenReserve}
                    onDismiss={(r) => dismissRecommendation(r.bookId)}
                  />
                ))}
              </RecommendationSection>
            )}

          {/* Section 4: Available Now on Stacks */}
          {(activeTab === 'all' || activeTab === 'available') && availableNow.length > 0 && (
            <RecommendationSection
              title="Available Now in Stacks"
              subtitle="Curated titles with physical copies currently waiting on library shelves"
              badge="Ready for Pickup"
              count={availableNow.length}
              icon={<CheckCircle2 className="w-5 h-5" />}
            >
              {availableNow.map((rec) => (
                <RecommendationCard
                  key={rec.id}
                  recommendation={rec}
                  onInspect={setInspectingRec}
                  onReserve={handleOpenReserve}
                  onDismiss={(r) => dismissRecommendation(r.bookId)}
                />
              ))}
            </RecommendationSection>
          )}
        </div>
      )}

      {/* "Why This Book?" Transparency Modal */}
      <WhyThisBookModal
        recommendation={inspectingRec}
        isOpen={Boolean(inspectingRec)}
        onClose={() => setInspectingRec(null)}
        onReserve={handleOpenReserve}
        onNavigate={onNavigate}
      />

      {/* Reservation Dialog Integration */}
      <ReserveBookModal
        book={reservingBook}
        isOpen={Boolean(reservingBook)}
        onClose={() => setReservingBook(null)}
      />
    </div>
  );
};
export default MemberRecommendationsPage;
