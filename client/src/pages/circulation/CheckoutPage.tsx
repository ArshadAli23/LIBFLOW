import React, { useState, useMemo, useEffect } from 'react';
import { useMembers } from '../../features/members/MembersContext';
import { useBooks } from '../../features/books/BooksContext';
import { useCirculation } from '../../features/circulation/CirculationContext';
import type { Member } from '../../features/members/types';
import type { Book, BookCopy } from '../../features/books/types';
import type { Loan } from '../../features/circulation/types';
import { MemberStatusBadge } from '../../features/members/components/MemberStatusBadge';
import { BookCover } from '../../features/books/components/BookCover';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/forms/FormControls';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../auth/AuthContext';
import {
  ArrowLeft,
  CheckCircle2,
  Repeat,
  ShieldAlert,
  Check,
} from 'lucide-react';

export interface CheckoutPageProps {
  onNavigate: (path: string) => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onNavigate }) => {
  const { members, getMemberById } = useMembers();
  const { books, copies, fetchCopiesForBook } = useBooks();
  const { checkoutBook, policy } = useCirculation();
  const { addToast } = useToast();
  const { user, role, authMode } = useAuth();
  const isAdmin = role === 'ADMIN';

  const basePath = isAdmin ? 'admin/circulation' : 'librarian/circulation';

  // Read initial query if any
  const queryParams = new URLSearchParams(window.location.search);
  const initialMemberParam = queryParams.get('memberId');

  // Step state
  const [selectedMember, setSelectedMember] = useState<Member | null>(() => {
    return initialMemberParam ? getMemberById(initialMemberParam) || null : null;
  });
  const [memberSearch, setMemberSearch] = useState('');

  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [bookSearch, setBookSearch] = useState('');

  const [selectedCopy, setSelectedCopy] = useState<BookCopy | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issuedLoanSuccess, setIssuedLoanSuccess] = useState<Loan | null>(null);

  // Auto-fetch copies for selected book in live mode
  useEffect(() => {
    if (selectedBook && authMode === 'live') {
      fetchCopiesForBook(selectedBook.id);
    }
  }, [selectedBook, authMode, fetchCopiesForBook]);

  // Auto-select member if query param provided
  useEffect(() => {
    if (initialMemberParam && members.length > 0 && !selectedMember) {
      const found = members.find((m) => m.id === initialMemberParam || m.memberId === initialMemberParam);
      if (found) {
        setSelectedMember(found);
      }
    }
  }, [initialMemberParam, members, selectedMember]);

  // Filter members
  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return [];
    const q = memberSearch.toLowerCase();
    return members.filter(
      (m) =>
        m.fullName.toLowerCase().includes(q) ||
        m.memberId.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
    );
  }, [members, memberSearch]);

  // Filter books (matches title, author, ISBN, or physical copy barcode)
  const filteredBooks = useMemo(() => {
    if (!bookSearch.trim()) return [];
    const q = bookSearch.trim().toLowerCase();
    const matchingCopyBookIds = new Set(
      copies.filter((c) => c.barcode.toLowerCase().includes(q)).map((c) => c.bookId)
    );
    return books.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.authors.some((a) => a.toLowerCase().includes(q)) ||
        b.isbn.toLowerCase().includes(q) ||
        matchingCopyBookIds.has(b.id)
    );
  }, [books, copies, bookSearch]);

  // Available copies of selected book
  const availableCopies = useMemo(() => {
    if (!selectedBook) return [];
    return copies.filter(
      (c) => c.bookId === selectedBook.id && c.status === 'AVAILABLE'
    );
  }, [copies, selectedBook]);

  const memberQuota = useMemo(() => {
    if (!selectedMember) return policy.studentLoanQuota;
    return selectedMember.memberType === 'FACULTY'
      ? policy.facultyLoanQuota
      : policy.studentLoanQuota;
  }, [selectedMember, policy]);

  // Validation warnings
  const memberEligibilityError = useMemo(() => {
    if (!selectedMember) return null;
    if (selectedMember.status === 'SUSPENDED') {
      return 'Member account is currently SUSPENDED. All circulation privileges are locked.';
    }
    if (selectedMember.status === 'EXPIRED') {
      return 'Membership expired. Renewal required before borrowing.';
    }
    if (selectedMember.status === 'PENDING') {
      return 'Membership is PENDING verification. Patron cannot borrow items yet.';
    }
    if (selectedMember.activeLoansCount >= memberQuota) {
      return `Member has reached maximum simultaneous loan quota (${memberQuota} items).`;
    }
    return null;
  }, [selectedMember, memberQuota]);

  // Execute checkout
  const handleConfirmCheckout = async () => {
    if (!selectedMember || !selectedBook || !selectedCopy) return;

    if (memberEligibilityError) {
      addToast({
        title: 'Checkout Blocked',
        message: memberEligibilityError,
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);
    const result = await checkoutBook({
      memberId: selectedMember.id,
      bookId: selectedBook.id,
      bookCopyId: selectedCopy.id,
      issuedBy: user?.name || 'Circulation Specialist',
    });

    if (result.success && result.loan) {
      setIssuedLoanSuccess(result.loan);
      addToast({
        title: 'Checkout Confirmed',
        message: `Volume ${result.loan.copyBarcode} issued to ${result.loan.memberName}. Due: ${result.loan.dueDate}.`,
        type: 'success',
      });
    } else {
      addToast({
        title: 'Checkout Rejected',
        message: result.error || 'Transaction could not be completed.',
        type: 'error',
      });
      setIsSubmitting(false);
    }
  };

  const handleStartNewCheckout = () => {
    setSelectedMember(null);
    setSelectedBook(null);
    setSelectedCopy(null);
    setMemberSearch('');
    setBookSearch('');
    setIssuedLoanSuccess(null);
    setIsSubmitting(false);
  };

  const [baseTimeMs] = useState(() => Date.now());
  const dueDateStr = useMemo(() => {
    const d = new Date(baseTimeMs + policy.loanDurationDays * 24 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
  }, [baseTimeMs, policy.loanDurationDays]);

  // Visual active step indicator (1, 2, or 3)
  const currentStep = !selectedMember ? 1 : !selectedCopy ? 2 : 3;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate(basePath)}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            className="text-xs font-mono"
          >
            Counter Desk
          </Button>
          <div className="h-4 w-px bg-border-subtle" />
          <div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-canvas-text tracking-tight">
              Circulation Desk — Issue Book
            </h1>
            <p className="text-xs text-canvas-muted">
              Fast-track patron credential lookup, barcode copy binding, and automated due-date stamping.
            </p>
          </div>
        </div>

        <span className="text-[11px] font-mono text-canvas-muted px-2.5 py-1 rounded-full bg-canvas-subtle border border-border-subtle hidden sm:inline-block">
          Standard Loan Window: 14 Days
        </span>
      </div>

      {/* 3-STEP PROGRESSION BAR (Section 6 Requirement) */}
      {!issuedLoanSuccess && (
        <div className="p-3.5 rounded-2xl border border-border-subtle bg-surface shadow-ambient">
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
            {/* Step 1: Member */}
            <div
              className={`p-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
                currentStep === 1
                  ? 'bg-brand/10 border border-brand/30 text-brand font-bold'
                  : selectedMember
                  ? 'bg-emerald-500/10 text-emerald-600 font-semibold'
                  : 'bg-canvas-subtle/50 text-canvas-muted'
              }`}
            >
              {selectedMember ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <span className="w-4 h-4 rounded-full bg-brand text-brand-foreground text-[10px] flex items-center justify-center">
                  1
                </span>
              )}
              <span className="text-xs tracking-wider uppercase">01 MEMBER</span>
            </div>

            {/* Step 2: Book */}
            <div
              className={`p-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
                currentStep === 2
                  ? 'bg-brand/10 border border-brand/30 text-brand font-bold'
                  : selectedCopy
                  ? 'bg-emerald-500/10 text-emerald-600 font-semibold'
                  : 'bg-canvas-subtle/50 text-canvas-muted'
              }`}
            >
              {selectedCopy ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <span className="w-4 h-4 rounded-full bg-canvas-muted text-surface text-[10px] flex items-center justify-center">
                  2
                </span>
              )}
              <span className="text-xs tracking-wider uppercase">02 BOOK & COPY</span>
            </div>

            {/* Step 3: Confirm */}
            <div
              className={`p-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
                currentStep === 3
                  ? 'bg-brand/10 border border-brand/30 text-brand font-bold'
                  : 'bg-canvas-subtle/50 text-canvas-muted'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-canvas-muted text-surface text-[10px] flex items-center justify-center">
                3
              </span>
              <span className="text-xs tracking-wider uppercase">03 CONFIRM</span>
            </div>
          </div>
        </div>
      )}

      {/* Success Receipt State with Animation */}
      {issuedLoanSuccess ? (
        <div className="p-8 sm:p-10 rounded-3xl border-2 border-emerald-500/30 bg-surface shadow-modal text-center space-y-6 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold block mb-1">
              Transaction Authorized & Recorded
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-canvas-text">
              Digital Checkout Slip Issued
            </h2>
            <p className="text-xs text-canvas-muted mt-1 font-mono">
              Receipt Reference: {issuedLoanSuccess.loanNumber}
            </p>
          </div>

          {/* Realistic Accession Slip */}
          <div className="max-w-md mx-auto p-5 rounded-2xl border border-border-subtle bg-canvas-subtle text-left space-y-3.5 text-xs font-mono shadow-inner">
            <div className="flex justify-between border-b border-border-subtle/60 pb-2">
              <span className="text-canvas-muted">Volume Accession Barcode</span>
              <span className="font-bold text-brand">{issuedLoanSuccess.copyBarcode}</span>
            </div>
            <div className="flex justify-between border-b border-border-subtle/60 pb-2">
              <span className="text-canvas-muted">Catalog Title</span>
              <span className="font-bold text-canvas-text truncate max-w-[240px]">
                {issuedLoanSuccess.bookTitle}
              </span>
            </div>
            <div className="flex justify-between border-b border-border-subtle/60 pb-2">
              <span className="text-canvas-muted">Borrower</span>
              <span className="text-canvas-text font-semibold">
                {issuedLoanSuccess.memberName} ({issuedLoanSuccess.memberBarcode})
              </span>
            </div>
            <div className="flex justify-between border-b border-border-subtle/60 pb-2">
              <span className="text-canvas-muted">Issue Date</span>
              <span className="text-canvas-text">{issuedLoanSuccess.checkoutDate}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-emerald-600 font-bold uppercase">Return Deadline</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                {issuedLoanSuccess.dueDate}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Button variant="secondary" size="sm" onClick={() => onNavigate(basePath)}>
              Return to Counter Desk
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleStartNewCheckout}
              leftIcon={<Repeat className="w-3.5 h-3.5" />}
              className="shadow-sm"
            >
              Issue Another Book
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* STEP 1: Find & Select Member */}
          <div className="p-6 rounded-2xl border border-border-subtle bg-surface space-y-4 shadow-card">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-brand/10 text-brand font-mono font-bold text-xs flex items-center justify-center">
                  1
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-canvas-text">
                    Identify Library Patron
                  </h3>
                  <p className="text-[11px] text-canvas-muted">
                    Search by student name, ID number, or institutional email
                  </p>
                </div>
              </div>

              {selectedMember && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMember(null);
                    setSelectedCopy(null);
                  }}
                  className="text-xs font-mono text-brand hover:underline"
                >
                  Change Patron
                </button>
              )}
            </div>

            {!selectedMember ? (
              <div className="space-y-3">
                <SearchInput
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  onClear={() => setMemberSearch('')}
                  placeholder="Search patron by name, ID (e.g. MEM-2026-081), or email..."
                  autoFocus
                />

                {memberSearch.trim() && (
                  <div className="rounded-xl border border-border-subtle bg-canvas-subtle/50 overflow-hidden divide-y divide-border-subtle/60 max-h-60 overflow-y-auto shadow-inner">
                    {filteredMembers.length === 0 ? (
                      <p className="p-4 text-xs text-canvas-muted text-center">
                        No registered members found matching &quot;{memberSearch}&quot;.
                      </p>
                    ) : (
                      filteredMembers.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => setSelectedMember(m)}
                          className="p-3 hover:bg-canvas-subtle cursor-pointer flex items-center justify-between gap-3 text-xs transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand/10 text-brand font-mono font-bold flex items-center justify-center shrink-0">
                              {m.initials}
                            </div>
                            <div>
                              <span className="font-semibold text-canvas-text block">
                                {m.fullName}
                              </span>
                              <span className="text-[11px] text-canvas-muted">
                                {m.memberId} • {m.program || m.department}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <MemberStatusBadge status={m.status} size="sm" />
                            <span className="font-mono text-[11px] text-canvas-muted">
                              {m.activeLoansCount}/5 Loans
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Selected Member Card with Quota Bar (Section 6 Requirement) */
              <div className="p-4 rounded-xl border border-border-subtle bg-canvas-subtle/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-brand/10 border-2 border-brand/20 text-brand font-mono font-bold text-base flex items-center justify-center shrink-0">
                    {selectedMember.initials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-serif font-bold text-canvas-text text-base">
                        {selectedMember.fullName}
                      </h4>
                      <MemberStatusBadge status={selectedMember.status} size="sm" />
                    </div>
                    <span className="text-xs text-canvas-muted font-mono block mt-0.5">
                      {selectedMember.memberId} • {selectedMember.department}
                    </span>
                  </div>
                </div>

                {/* Quota Progress */}
                <div className="sm:text-right font-mono text-xs space-y-1">
                  <div className="flex sm:justify-end items-center gap-2">
                    <span className="text-canvas-muted text-[11px]">Loan Quota:</span>
                    <span className="font-bold text-canvas-text">
                      {selectedMember.activeLoansCount} of {memberQuota} items
                    </span>
                  </div>
                  <div className="w-32 h-1.5 rounded-full bg-border-subtle overflow-hidden sm:ml-auto">
                    <div
                      className={`h-full rounded-full ${
                        selectedMember.activeLoansCount >= memberQuota
                          ? 'bg-rose-500'
                          : 'bg-brand'
                      }`}
                      style={{
                        width: `${Math.min(100, (selectedMember.activeLoansCount / memberQuota) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Error banner if member cannot borrow */}
            {memberEligibilityError && (
              <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{memberEligibilityError}</span>
              </div>
            )}
          </div>

          {/* STEP 2: Find & Select Book Copy (Visible once member is selected) */}
          {selectedMember && !memberEligibilityError && (
            <div className="p-6 rounded-2xl border border-border-subtle bg-surface space-y-4 shadow-card">
              <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-brand/10 text-brand font-mono font-bold text-xs flex items-center justify-center">
                    2
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-canvas-text">
                      Catalog Title & Physical Volume Copy
                    </h3>
                    <p className="text-[11px] text-canvas-muted">
                      Search accession catalog and select an available shelf copy
                    </p>
                  </div>
                </div>

                {selectedBook && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBook(null);
                      setSelectedCopy(null);
                    }}
                    className="text-xs font-mono text-brand hover:underline"
                  >
                    Change Title
                  </button>
                )}
              </div>

              {!selectedBook ? (
                <div className="space-y-3">
                  <SearchInput
                    value={bookSearch}
                    onChange={(e) => setBookSearch(e.target.value)}
                    onClear={() => setBookSearch('')}
                    placeholder="Search catalog by title, author, or ISBN (e.g. Pragmatic, 9780135957059)..."
                  />

                  {bookSearch.trim() && (
                    <div className="rounded-xl border border-border-subtle bg-canvas-subtle/50 overflow-hidden divide-y divide-border-subtle/60 max-h-60 overflow-y-auto shadow-inner">
                      {filteredBooks.length === 0 ? (
                        <p className="p-4 text-xs text-canvas-muted text-center">
                          No catalog records found matching &quot;{bookSearch}&quot;.
                        </p>
                      ) : (
                        filteredBooks.map((b) => (
                          <div
                            key={b.id}
                            onClick={() => {
                              setSelectedBook(b);
                              setSelectedCopy(null);
                            }}
                            className="p-3 hover:bg-canvas-subtle cursor-pointer flex items-center justify-between gap-3 text-xs transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <BookCover
                                title={b.title}
                                author={b.authors[0]}
                                category={b.category}
                                coverUrl={b.coverUrl}
                                size="sm"
                                className="w-8 h-11 shrink-0 rounded-xs shadow-sm"
                              />
                              <div>
                                <span className="font-serif font-bold text-sm text-canvas-text block truncate max-w-sm">
                                  {b.title}
                                </span>
                                <span className="text-[11px] text-canvas-muted">
                                  {b.authors.join(', ')} • Call: <strong className="font-mono">{b.callNumber}</strong>
                                </span>
                              </div>
                            </div>

                            <div className="text-right font-mono">
                              <span
                                className={`font-semibold block ${
                                  b.availableCopies > 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-600'
                                }`}
                              >
                                {b.availableCopies} Available
                              </span>
                              <span className="text-[10px] text-canvas-muted">
                                {b.totalCopies} Total Copies
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Selected Book & Copies Picker */
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-border-subtle bg-canvas-subtle/50 flex items-center gap-4 text-xs">
                    <BookCover
                      title={selectedBook.title}
                      author={selectedBook.authors[0]}
                      category={selectedBook.category}
                      coverUrl={selectedBook.coverUrl}
                      size="sm"
                      className="w-10 h-14 shrink-0 rounded-sm shadow-sm"
                    />
                    <div>
                      <h4 className="font-serif font-bold text-canvas-text text-sm sm:text-base">
                        {selectedBook.title}
                      </h4>
                      <span className="text-canvas-muted text-xs block mt-0.5">
                        By {selectedBook.authors.join(', ')} • Call: <strong className="font-mono">{selectedBook.callNumber}</strong>
                      </span>
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
                        {selectedBook.availableCopies} Copies Available on Shelf
                      </span>
                    </div>
                  </div>

                  {/* Physical Volume Copy Picker Chips */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-canvas-muted font-bold block">
                      Select Available Volume Copy
                    </label>

                    {availableCopies.length === 0 ? (
                      <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs">
                        All physical copies for this title are currently checked out or reserved.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {availableCopies.map((copy) => {
                          const isSelected = selectedCopy?.id === copy.id;
                          return (
                            <div
                              key={copy.id}
                              onClick={() => setSelectedCopy(copy)}
                              className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                                isSelected
                                  ? 'border-brand bg-brand/10 shadow-sm'
                                  : 'border-border-subtle bg-surface hover:border-border-strong'
                              }`}
                            >
                              <div className="space-y-0.5 font-mono">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-brand">{copy.barcode}</span>
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-canvas-subtle uppercase">
                                    {copy.condition}
                                  </span>
                                </div>
                                <span className="text-[11px] text-canvas-muted block font-sans">
                                  Shelf Location: <strong>{copy.shelf}</strong>
                                </span>
                              </div>

                              <div
                                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? 'bg-brand border-brand text-brand-foreground'
                                    : 'border-border-subtle bg-surface'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Transaction Review & Confirm */}
          {selectedMember && selectedBook && selectedCopy && !memberEligibilityError && (
            <div className="p-6 rounded-2xl border-2 border-brand/40 bg-surface space-y-5 shadow-card animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-center gap-2.5 border-b border-border-subtle pb-3">
                <div className="w-6 h-6 rounded-md bg-brand text-brand-foreground font-mono font-bold text-xs flex items-center justify-center">
                  3
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-canvas-text">
                    Circulation Transaction Review
                  </h3>
                  <p className="text-[11px] text-canvas-muted">
                    Verify borrower identity and volume barcode before authorizing loan
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3.5 rounded-xl bg-canvas-subtle/50 border border-border-subtle/60">
                  <span className="text-[10px] text-canvas-muted uppercase block font-sans">Borrower</span>
                  <span className="font-bold text-canvas-text block mt-0.5 truncate">{selectedMember.fullName}</span>
                  <span className="text-[10px] text-canvas-muted">{selectedMember.memberId}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-canvas-subtle/50 border border-border-subtle/60">
                  <span className="text-[10px] text-canvas-muted uppercase block font-sans">Volume Barcode</span>
                  <span className="font-bold text-brand block mt-0.5">{selectedCopy.barcode}</span>
                  <span className="text-[10px] text-canvas-muted">Shelf: {selectedCopy.shelf}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-canvas-subtle/50 border border-border-subtle/60">
                  <span className="text-[10px] text-emerald-600 uppercase font-bold block font-sans">Due Date (+14d)</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm block mt-0.5">
                    {dueDateStr}
                  </span>
                  <span className="text-[10px] text-canvas-muted">2 Extensions Allowed</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleStartNewCheckout}
                  disabled={isSubmitting}
                >
                  Clear Selection
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleConfirmCheckout}
                  disabled={isSubmitting}
                  leftIcon={<Repeat className="w-3.5 h-3.5" />}
                  className="shadow-sm"
                >
                  {isSubmitting ? 'Authorizing...' : 'Authorize & Issue Copy'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
