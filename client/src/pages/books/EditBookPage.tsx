/**
 * LIBFLOW — Edit Bibliographic Book Record Page
 * 
 * CORE DOMAIN RULE:
 * Edits title-level bibliographic metadata only.
 * Physical copy accessioning and shelf locations remain strictly managed under the Copies view.
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Copy, RefreshCw } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useBooks } from '../../features/books/BooksContext';
import { BookCover } from '../../features/books/components/BookCover';
import { FormField, Input, Textarea, Select } from '../../components/forms/FormControls';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/data-display/Cards';
import { Alert, Spinner } from '../../components/feedback/FeedbackStates';
import type { BookFormat } from '../../features/books/types';

export interface EditBookPageProps {
  bookId: string;
  onNavigate: (route: string) => void;
}

export const EditBookPage: React.FC<EditBookPageProps> = ({ bookId, onNavigate }) => {
  const { user, authMode } = useAuth();
  const { getBookById, updateBook, fetchBookById } = useBooks();

  const book = getBookById(bookId);

  // Form States initialized directly from book record
  const [title, setTitle] = useState(() => book?.title || '');
  const [subtitle, setSubtitle] = useState(() => book?.subtitle || '');
  const [authors, setAuthors] = useState(() => book?.authors.join(', ') || '');
  const [isbn, setIsbn] = useState(() => book?.isbn || '');
  const [publisher, setPublisher] = useState(() => book?.publisher || '');
  const [publicationYear, setPublicationYear] = useState(() => String(book?.publicationYear || '2026'));
  const [edition, setEdition] = useState(() => book?.edition || '');
  const [language, setLanguage] = useState(() => book?.language || 'English');
  const [format, setFormat] = useState<BookFormat>(() => book?.format || 'HARDCOVER');
  const [category, setCategory] = useState(() => book?.category || '');
  const [subcategory, setSubcategory] = useState(() => book?.subcategory || '');
  const [tags, setTags] = useState(() => book?.tags.join(', ') || '');
  const [description, setDescription] = useState(() => book?.description || '');
  const [coverUrl, setCoverUrl] = useState(() => book?.coverUrl || '');
  const [subject, setSubject] = useState(() => book?.subject || '');
  const [callNumber, setCallNumber] = useState(() => book?.callNumber || '');
  const [deweyDecimal, setDeweyDecimal] = useState(() => book?.deweyDecimal || '');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLoadingRecord, setIsLoadingRecord] = useState(!book && authMode === 'live');
  const [loadError, setLoadError] = useState<string | null>(null);

  // LIVE MODE: Fetch book record if not present in memory cache
  useEffect(() => {
    if (!book && authMode === 'live') {
      setIsLoadingRecord(true);
      setLoadError(null);
      fetchBookById(bookId)
        .then((fetched) => {
          setIsLoadingRecord(false);
          if (fetched) {
            setTitle(fetched.title);
            setSubtitle(fetched.subtitle || '');
            setAuthors(fetched.authors.join(', '));
            setIsbn(fetched.isbn);
            setPublisher(fetched.publisher);
            setPublicationYear(String(fetched.publicationYear));
            setEdition(fetched.edition || '');
            setLanguage(fetched.language || 'English');
            setFormat(fetched.format);
            setCategory(fetched.category);
            setSubcategory(fetched.subcategory || '');
            setTags(fetched.tags.join(', '));
            setDescription(fetched.description || '');
            setCoverUrl(fetched.coverUrl || '');
            setSubject(fetched.subject || '');
            setCallNumber(fetched.callNumber || '');
            setDeweyDecimal(fetched.deweyDecimal || '');
          }
        })
        .catch((err) => {
          setIsLoadingRecord(false);
          setLoadError(err instanceof Error ? err.message : 'Failed to retrieve book record.');
        });
    }
  }, [book, authMode, bookId, fetchBookById]);

  if (isLoadingRecord) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-surface rounded-xl border border-border-subtle shadow-card max-w-5xl mx-auto">
        <Spinner size="lg" />
        <span className="text-xs font-mono text-canvas-muted">Loading bibliographic record...</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto py-8">
        <Alert
          variant="error"
          title="Error Loading Record"
          description={loadError}
          action={
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={() => {
                setIsLoadingRecord(true);
                setLoadError(null);
                fetchBookById(bookId)
                  .then(() => setIsLoadingRecord(false))
                  .catch((err) => {
                    setIsLoadingRecord(false);
                    setLoadError(err instanceof Error ? err.message : 'Failed to retrieve book record.');
                  });
              }}
              className="text-xs mt-2"
            >
              Retry
            </Button>
          }
        />
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => onNavigate('admin/collection/books')}
        >
          Return to Catalog
        </Button>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="py-16 text-center space-y-4">
        <h2 className="text-xl font-bold font-serif text-canvas-text">Book Not Found</h2>
        <p className="text-xs text-canvas-muted">The requested catalog item does not exist.</p>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => onNavigate('admin/collection/books')}
        >
          Return to Catalog
        </Button>
      </div>
    );
  }

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Book title is required.';
    if (!authors.trim()) newErrors.authors = 'At least one author is required.';
    if (!isbn.trim()) newErrors.isbn = 'ISBN is required.';
    if (!publisher.trim()) newErrors.publisher = 'Publisher is required.';
    if (!description.trim()) newErrors.description = 'A catalog description is required.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    setSubmitError(null);
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);

    const authorList = authors
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);

    const tagList = tags
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    try {
      await updateBook(book.id, {
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        authors: authorList,
        isbn: isbn.trim(),
        publisher: publisher.trim(),
        publicationYear: parseInt(publicationYear, 10) || book.publicationYear,
        edition: edition.trim() || undefined,
        language: language.trim() || 'English',
        format,
        category: category.trim(),
        subcategory: subcategory.trim() || undefined,
        tags: tagList,
        description: description.trim(),
        coverUrl: coverUrl.trim() || undefined,
        subject: subject.trim() || undefined,
        callNumber: callNumber.trim() || undefined,
        deweyDecimal: deweyDecimal.trim() || undefined,
        updatedBy: user?.name || 'Administrator',
      });

      setIsSubmitting(false);
      onNavigate(`admin/collection/books/${book.id}`);
    } catch (err: unknown) {
      setIsSubmitting(false);
      const msg = err instanceof Error ? err.message : 'Failed to update bibliographic record.';
      setSubmitError(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-200">
      {/* Update Error Banner */}
      {submitError && (
        <Alert
          variant="error"
          title="Update Failed"
          description={submitError}
          onClose={() => setSubmitError(null)}
        />
      )}

      {/* Header & Breadcrumb */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div>
          <button
            type="button"
            onClick={() => onNavigate(`admin/collection/books/${book.id}`)}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-canvas-muted hover:text-canvas-text mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Cancel and return to "{book.title.slice(0, 30)}..."</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-canvas-text tracking-tight">
            Edit Bibliographic Record
          </h1>
          <p className="text-xs sm:text-sm text-canvas-muted mt-1">
            Updating master catalog record. Physical copy inventory items remain separate.
          </p>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigate(`admin/collection/books/${book.id}`)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Save className="w-4 h-4" />}
            onClick={handleSave}
            isLoading={isSubmitting}
            className="shadow-ambient"
          >
            Save Changes
          </Button>
        </div>
      </div>

      {/* Record Provenance Meta Strip */}
      <div className="p-3.5 rounded-xl bg-canvas-subtle border border-border-subtle flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-mono text-canvas-muted">Record ID: <strong className="text-canvas-text">{book.id}</strong></span>
          <span className="text-border-strong">•</span>
          <span className="font-mono text-canvas-muted">Physical Copies: <strong className="text-brand">{book.totalCopies}</strong></span>
        </div>
        <div className="text-[11px] font-mono text-canvas-muted">
          Last updated: <span className="text-canvas-text">{new Date(book.updatedAt).toLocaleString()}</span> by <span className="text-canvas-text">{book.updatedBy || 'Arthur Pendelton'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Form Sections */}
        <div className="lg:col-span-2 space-y-8">
          {/* Section 1: Basic Information */}
          <Card variant="default">
            <div className="border-b border-border-subtle pb-3 mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-canvas-text">1. Basic Information</h3>
                <p className="text-xs text-canvas-muted">Bibliographic record data</p>
              </div>
              <span className="text-[10px] font-mono text-rose-500 uppercase font-semibold">* Required</span>
            </div>

            <div className="space-y-4">
              <FormField label="Book Title" error={errors.title} required>
                <Input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
                  }}
                  hasError={!!errors.title}
                />
              </FormField>

              <FormField label="Subtitle (Optional)">
                <Input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Author(s) (comma-separated)" error={errors.authors} required>
                  <Input
                    type="text"
                    value={authors}
                    onChange={(e) => {
                      setAuthors(e.target.value);
                      if (errors.authors) setErrors((prev) => ({ ...prev, authors: '' }));
                    }}
                    hasError={!!errors.authors}
                  />
                </FormField>

                <FormField label="ISBN-10 or ISBN-13" error={errors.isbn} required>
                  <Input
                    type="text"
                    value={isbn}
                    onChange={(e) => {
                      setIsbn(e.target.value);
                      if (errors.isbn) setErrors((prev) => ({ ...prev, isbn: '' }));
                    }}
                    hasError={!!errors.isbn}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label="Publisher" error={errors.publisher} required>
                  <Input
                    type="text"
                    value={publisher}
                    onChange={(e) => {
                      setPublisher(e.target.value);
                      if (errors.publisher) setErrors((prev) => ({ ...prev, publisher: '' }));
                    }}
                    hasError={!!errors.publisher}
                  />
                </FormField>

                <FormField label="Publication Year">
                  <Input
                    type="number"
                    value={publicationYear}
                    onChange={(e) => setPublicationYear(e.target.value)}
                  />
                </FormField>

                <FormField label="Edition">
                  <Input
                    type="text"
                    value={edition}
                    onChange={(e) => setEdition(e.target.value)}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Language">
                  <Input
                    type="text"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  />
                </FormField>

                <FormField label="Format">
                  <Select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as BookFormat)}
                    options={[
                      { value: 'HARDCOVER', label: 'Hardcover (Clothbound)' },
                      { value: 'PAPERBACK', label: 'Paperback (Trade)' },
                      { value: 'DIGITAL', label: 'Digital Publication' },
                      { value: 'PERIODICAL', label: 'Periodical / Journal' },
                    ]}
                  />
                </FormField>
              </div>
            </div>
          </Card>

          {/* Section 2: Classification */}
          <Card variant="default">
            <div className="border-b border-border-subtle pb-3 mb-4">
              <h3 className="text-sm font-semibold text-canvas-text">2. Classification & Subject Taxonomy</h3>
              <p className="text-xs text-canvas-muted">Subject mapping for OPAC catalog discovery</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Primary Category" required>
                  <Select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    options={[
                      { value: 'Software Engineering', label: 'Software Engineering' },
                      { value: 'System Architecture', label: 'System Architecture' },
                      { value: 'Algorithms & Complexity', label: 'Algorithms & Complexity' },
                      { value: 'Database Systems', label: 'Database Systems' },
                      { value: 'Computer Science Theory', label: 'Computer Science Theory' },
                      { value: 'Artificial Intelligence', label: 'Artificial Intelligence' },
                      { value: 'Human-Computer Interaction', label: 'Human-Computer Interaction' },
                    ]}
                  />
                </FormField>

                <FormField label="Subcategory">
                  <Input
                    type="text"
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                  />
                </FormField>
              </div>

              <FormField label="Subject Tags (comma-separated)">
                <Input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
              </FormField>
            </div>
          </Card>

          {/* Section 3: Description */}
          <Card variant="default">
            <div className="border-b border-border-subtle pb-3 mb-4">
              <h3 className="text-sm font-semibold text-canvas-text">3. Catalog Description</h3>
            </div>

            <FormField label="Abstract / Description" error={errors.description} required>
              <Textarea
                rows={4}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (errors.description) setErrors((prev) => ({ ...prev, description: '' }));
                }}
                hasError={!!errors.description}
              />
            </FormField>
          </Card>

          {/* Section 4: Library Metadata */}
          <Card variant="default">
            <div className="border-b border-border-subtle pb-3 mb-4">
              <h3 className="text-sm font-semibold text-canvas-text">4. Call Numbers & Shelf Classification</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Dewey Decimal Number">
                <Input
                  type="text"
                  value={deweyDecimal}
                  onChange={(e) => setDeweyDecimal(e.target.value)}
                />
              </FormField>

              <FormField label="Library of Congress Call #">
                <Input
                  type="text"
                  value={callNumber}
                  onChange={(e) => setCallNumber(e.target.value)}
                />
              </FormField>

              <FormField label="Subject Authority Code">
                <Input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </FormField>
            </div>
          </Card>
        </div>

        {/* Right 1 Col: Cover Preview & Copies Jump */}
        <div className="space-y-6">
          <Card variant="default">
            <h3 className="text-sm font-semibold text-canvas-text mb-3">Live Cover Preview</h3>

            <div className="flex justify-center p-4 rounded-xl bg-canvas-subtle border border-border-subtle">
              <BookCover
                title={title || book.title}
                author={authors || book.authors[0]}
                category={category || book.category}
                coverUrl={coverUrl}
                size="lg"
                className="shadow-lg"
              />
            </div>

            <div className="mt-4 space-y-3">
              <FormField label="Cover Image URL">
                <Input
                  type="url"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="https://... cover image"
                />
              </FormField>
            </div>
          </Card>

          {/* Quick Access to Physical Copies */}
          <div className="p-5 rounded-xl border border-border-subtle bg-surface shadow-card space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-canvas-muted">
              <Copy className="w-4 h-4 text-brand" />
              <span>Physical Inventory</span>
            </div>
            <p className="text-xs text-canvas-muted leading-relaxed">
              This title has <strong className="text-canvas-text">{book.totalCopies} physical copies</strong> registered in the accession ledger.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigate(`admin/collection/books/${book.id}?tab=copies`)}
              className="w-full justify-center text-xs"
            >
              Manage Physical Copies ({book.totalCopies}) →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
