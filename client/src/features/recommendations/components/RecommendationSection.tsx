/**
 * LIBFLOW — Recommendation Section Container
 * 
 * Editorial layout grouping recommendations by origin (Curated For You, Because You Read,
 * Department Trending, and Real-time Shelf Ready).
 */

import React from 'react';

export interface RecommendationSectionProps {
  title: string;
  subtitle?: string;
  badge?: string;
  count?: number;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const RecommendationSection: React.FC<RecommendationSectionProps> = ({
  title,
  subtitle,
  badge,
  count,
  icon,
  children,
  className = '',
}) => {
  return (
    <section className={`space-y-4 ${className}`}>
      {/* Editorial Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-2 border-b border-stone-200 dark:border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            {icon && <span className="text-amber-700 dark:text-amber-500">{icon}</span>}
            <h2 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100 tracking-tight">
              {title}
            </h2>
            {badge && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700">
                {badge}
              </span>
            )}
            {typeof count === 'number' && (
              <span className="text-xs font-mono text-stone-400">
                ({count})
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {children}
      </div>
    </section>
  );
};
