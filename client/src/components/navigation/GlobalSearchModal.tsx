/**
 * LIBFLOW — Global Command Palette & Search Modal (⌘K)
 * 
 * Accessible, fast mock search for Books, Members, Book Copies, and Reservations.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, BookOpen, Users, Copy, Clock, ArrowRight } from 'lucide-react';
import { MOCK_SEARCH_ITEMS, type SearchResultItem } from '../../auth/mockAuth';

export interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (route: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectResult,
}) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setQuery('');
    setSelectedCategory('All');
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (!isOpen) return null;

  const categories = ['All', 'Books', 'Members', 'Book Copies', 'Reservations'];

  const filteredItems = MOCK_SEARCH_ITEMS.filter((item) => {
    const matchesCategory =
      selectedCategory === 'All' || item.category === selectedCategory;
    const matchesQuery =
      !query.trim() ||
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(query.toLowerCase()) ||
      (item.badge && item.badge.toLowerCase().includes(query.toLowerCase()));
    return matchesCategory && matchesQuery;
  });

  const getCategoryIcon = (category: SearchResultItem['category']) => {
    switch (category) {
      case 'Books':
        return <BookOpen className="w-3.5 h-3.5 text-sky-500" />;
      case 'Members':
        return <Users className="w-3.5 h-3.5 text-emerald-500" />;
      case 'Book Copies':
        return <Copy className="w-3.5 h-3.5 text-amber-500" />;
      case 'Reservations':
        return <Clock className="w-3.5 h-3.5 text-purple-500" />;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="global-search-label"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-2xl bg-surface border border-border-strong rounded-2xl shadow-modal overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border-subtle bg-surface">
          <Search className="w-5 h-5 text-canvas-muted shrink-0" />
          <input
            ref={inputRef}
            id="global-search-label"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search catalog, member identifiers, copy barcodes, or hold queue..."
            className="flex-1 bg-transparent border-0 text-sm sm:text-base text-canvas-text placeholder:text-canvas-muted/70 focus:outline-hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded text-canvas-muted hover:text-canvas-text"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-canvas-muted bg-canvas-subtle border border-border-subtle rounded">
            ESC
          </kbd>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-canvas-subtle/50 border-b border-border-subtle overflow-x-auto text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-brand text-brand-foreground font-semibold shadow-xs'
                  : 'text-canvas-muted hover:text-canvas-text hover:bg-canvas-subtle'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-border-subtle/30">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-canvas-muted text-xs">
              <p>No catalog or directory records match "{query}".</p>
              <p className="mt-1 text-[11px]">Try searching by author, member name, or copy ID.</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectResult(item.route);
                  handleClose();
                }}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-canvas-subtle/80 transition-colors text-left group"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-1.5 rounded-md bg-canvas-subtle border border-border-subtle mt-0.5 shrink-0">
                    {getCategoryIcon(item.category)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-canvas-text group-hover:text-brand truncate">
                        {item.title}
                      </span>
                      {item.badge && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-canvas-subtle text-canvas-muted shrink-0">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-canvas-muted truncate mt-0.5">
                      {item.subtitle}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-canvas-muted group-hover:text-brand group-hover:translate-x-0.5 transition-all opacity-0 group-hover:opacity-100 shrink-0 ml-2" />
              </button>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2 border-t border-border-subtle bg-canvas-subtle/30 flex items-center justify-between text-[11px] font-mono text-canvas-muted">
          <span>Search scope: Central Catalog & Member Ledger</span>
          <span>Mock Demonstration Data</span>
        </div>
      </div>
    </div>
  );
};
