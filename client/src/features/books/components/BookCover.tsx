/**
 * LIBFLOW — Editorial Book Cover Component
 * 
 * Renders high-fidelity book covers with fallback editorial procedural designs,
 * tactile spine highlights, and elevation shadows.
 */

import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface BookCoverProps {
  title: string;
  author?: string;
  category?: string;
  coverUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const BookCover: React.FC<BookCoverProps> = ({
  title,
  author,
  category,
  coverUrl,
  size = 'md',
  className,
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    xs: 'w-8 h-12 text-[8px] rounded-xs',
    sm: 'w-12 h-18 text-[9px] rounded-xs',
    md: 'w-20 h-28 text-[10px] rounded-sm',
    lg: 'w-32 h-44 text-xs rounded-md',
    xl: 'w-48 h-64 text-sm rounded-lg',
  };

  // Deterministic spine hue based on book title length/chars
  const getPalette = (str: string) => {
    const palettes = [
      'from-slate-900 to-indigo-950 text-indigo-100 border-indigo-800/40',
      'from-zinc-900 to-emerald-950 text-emerald-100 border-emerald-800/40',
      'from-neutral-900 to-amber-950 text-amber-100 border-amber-800/40',
      'from-slate-950 to-rose-950 text-rose-100 border-rose-800/40',
      'from-stone-900 to-sky-950 text-sky-100 border-sky-800/40',
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return palettes[Math.abs(hash) % palettes.length];
  };

  const palette = getPalette(title);

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden select-none shadow-md border transition-transform duration-200 aspect-[2/3] flex flex-col justify-between group',
        sizeClasses[size],
        className
      )}
    >
      {/* Real Cover Image if present and loaded */}
      {coverUrl && !imageError ? (
        <>
          <img
            src={coverUrl}
            alt={`Cover of ${title}`}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover rounded-[inherit]"
            loading="lazy"
          />
          {/* Subtle Book Spine Highlight Overlay */}
          <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-r from-black/40 via-white/10 to-transparent pointer-events-none" />
          <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-[inherit] pointer-events-none" />
        </>
      ) : (
        /* Procedural Editorial Cover Fallback */
        <div
          className={cn(
            'w-full h-full bg-gradient-to-br p-2 sm:p-2.5 flex flex-col justify-between',
            palette
          )}
        >
          {/* Top Category Badge / Icon */}
          <div className="flex items-center justify-between opacity-80">
            <span className="font-mono text-[8px] uppercase tracking-wider truncate">
              {category || 'LIBFLOW'}
            </span>
            <BookOpen className="w-2.5 h-2.5 shrink-0 opacity-70" />
          </div>

          {/* Center Title */}
          <div className="my-auto py-1">
            <h4 className="font-serif font-bold leading-tight line-clamp-3 text-white drop-shadow-xs">
              {title}
            </h4>
          </div>

          {/* Bottom Author */}
          {author && (
            <div className="pt-1 border-t border-white/15 opacity-80">
              <p className="font-mono text-[9px] truncate text-white/90">
                {author}
              </p>
            </div>
          )}

          {/* Spine simulation shadow */}
          <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-r from-black/50 to-transparent pointer-events-none" />
          <div className="absolute inset-0 ring-1 ring-inset ring-white/15 pointer-events-none" />
        </div>
      )}
    </div>
  );
};
