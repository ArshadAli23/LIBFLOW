/**
 * LIBFLOW — Add New Bibliographic Book Record Page
 * 
 * Form sections: Basic Info, Classification, Description, Media & Preview, Library Metadata.
 * Validation, live cover preview, and Save / Save & Add Copies actions.
 */

import React, { useState } from 'react';
import { ArrowLeft, Save, Plus } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useBooks } from '../../features/books/BooksContext';
import { BookCover } from '../../features/books/components/BookCover';
import { FormField, Input, Textarea, Select } from '../../components/forms/FormControls';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/data-display/Cards';
import { Alert } from '../../components/feedback/FeedbackStates';
import type { BookFormat } from '../../features/books/types';

export interface AddBookPageProps {
  onNavigate: (route: string) => void;
}

export const AddBookPage: React.FC<AddBookPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { addBook } = useBooks();

  // Basic Information
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [authors, setAuthors] = useState('');
  const [isbn, setIsbn] = useState('');
  const [publisher, setPublisher] = useState('');
  const [publicationYear, setPublicationYear] = useState('2026');
  const [edition, setEdition] = useState('1st Edition');
  const [language, setLanguage] = useState('English');
  const [format, setFormat] = useState<BookFormat>('HARDCOVER');

  // Classification
  const [category, setCategory] = useState('Software Engineering');
  const [subcategory, setSubcategory] = useState('System Architecture');
  const [tags, setTags] = useState('Architecture, Engineering, Best Practices');

  // Description
  const [description, setDescription] = useState('');
  const [keywords, setKeywords] = useState('');

  // Media
  const [coverUrl, setCoverUrl] = useState('');

  // Library Metadata
  const [subject, setSubject] = useState('Computer science -- Systems');
  const [callNumber, setCallNumber] = useState('QA76.76');
  const [deweyDecimal, setDeweyDecimal] = useState('005.1');

  // Errors state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Book title is required.';
    if (!authors.trim()) newErrors.authors = 'At least one author is required.';
    if (!isbn.trim()) {
      newErrors.isbn = 'ISBN is required.';
    } else if (isbn.replace(/[-\s]/g, '').length < 10) {
      newErrors.isbn = 'ISBN must be at least 10 digits.';
    }
    if (!publisher.trim()) newErrors.publisher = 'Publisher is required.';
    if (!description.trim()) newErrors.description = 'A catalog description is required.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (addCopiesImmediately: boolean = false) => {
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
      const createdBook = await addBook({
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        authors: authorList,
        isbn: isbn.trim(),
        publisher: publisher.trim(),
        publicationYear: parseInt(publicationYear, 10) || 2026,
        edition: edition.trim() || '1st Edition',
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
        status: 'ACTIVE',
        updatedBy: user?.name || 'Administrator',
      });

      setIsSubmitting(false);

      if (addCopiesImmediately) {
        onNavigate(`admin/collection/books/${createdBook.id}?tab=copies`);
      } else {
        onNavigate(`admin/collection/books/${createdBook.id}`);
      }
    } catch (err: unknown) {
      setIsSubmitting(false);
      const msg = err instanceof Error ? err.message : 'Failed to create bibliographic record.';
      setSubmitError(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-200">
      {/* Creation Error Banner */}
      {submitError && (
        <Alert
          variant="error"
          title="Failed to Create Book"
          description={submitError}
          onClose={() => setSubmitError(null)}
        />
      )}

      {/* Header & Breadcrumb */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div>
          <button
            type="button"
            onClick={() => onNavigate('admin/collection/books')}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-canvas-muted hover:text-canvas-text mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Cancel and return to catalog</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-canvas-text tracking-tight">
            Add New Book to Collection
          </h1>
          <p className="text-xs sm:text-sm text-canvas-muted mt-1">
            Create an authority bibliographic record. Physical copies can be accessioned next.
          </p>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigate('admin/collection/books')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Save className="w-4 h-4" />}
            onClick={() => handleSave(false)}
            isLoading={isSubmitting}
            className="shadow-ambient"
          >
            Save Book
          </Button>
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
                <p className="text-xs text-canvas-muted">Essential bibliographic identification data</p>
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
                  placeholder="e.g. Designing Data-Intensive Applications"
                  hasError={!!errors.title}
                  autoFocus
                />
              </FormField>

              <FormField label="Subtitle (Optional)">
                <Input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="e.g. The Big Ideas Behind Reliable, Scalable, and Maintainable Systems"
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
                    placeholder="e.g. Martin Kleppmann, Andrew Hunt"
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
                    placeholder="e.g. 9781449373320"
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
                    placeholder="e.g. O'Reilly Media"
                    hasError={!!errors.publisher}
                  />
                </FormField>

                <FormField label="Publication Year">
                  <Input
                    type="number"
                    value={publicationYear}
                    onChange={(e) => setPublicationYear(e.target.value)}
                    placeholder="e.g. 2026"
                  />
                </FormField>

                <FormField label="Edition">
                  <Input
                    type="text"
                    value={edition}
                    onChange={(e) => setEdition(e.target.value)}
                    placeholder="e.g. 2nd Edition"
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Language">
                  <Input
                    type="text"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    placeholder="e.g. English, French"
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
              <p className="text-xs text-canvas-muted">Categorization for library catalog search</p>
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
                    placeholder="e.g. Distributed Storage, Graph Theory"
                  />
                </FormField>
              </div>

              <FormField label="Subject Tags (comma-separated)">
                <Input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g. Distributed Systems, Replication, Consensus"
                />
              </FormField>
            </div>
          </Card>

          {/* Section 3: Description */}
          <Card variant="default">
            <div className="border-b border-border-subtle pb-3 mb-4">
              <h3 className="text-sm font-semibold text-canvas-text">3. Catalog Description & Keywords</h3>
              <p className="text-xs text-canvas-muted">Full synopsis shown on discovery cards and OPAC detail</p>
            </div>

            <div className="space-y-4">
              <FormField label="Abstract / Description" error={errors.description} required>
                <Textarea
                  rows={4}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (errors.description) setErrors((prev) => ({ ...prev, description: '' }));
                  }}
                  placeholder="Comprehensive description of the volume's subject matter and scope..."
                  hasError={!!errors.description}
                />
              </FormField>

              <FormField label="Search Keywords & Synonyms">
                <Input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="e.g. sharding, raft consensus, event sourcing"
                />
              </FormField>
            </div>
          </Card>

          {/* Section 4: Library Metadata */}
          <Card variant="default">
            <div className="border-b border-border-subtle pb-3 mb-4">
              <h3 className="text-sm font-semibold text-canvas-text">4. Institutional Library Call Numbers</h3>
              <p className="text-xs text-canvas-muted">Dewey Decimal & Library of Congress shelf classification</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Dewey Decimal Number">
                <Input
                  type="text"
                  value={deweyDecimal}
                  onChange={(e) => setDeweyDecimal(e.target.value)}
                  placeholder="e.g. 005.1"
                />
              </FormField>

              <FormField label="Library of Congress Call #">
                <Input
                  type="text"
                  value={callNumber}
                  onChange={(e) => setCallNumber(e.target.value)}
                  placeholder="e.g. QA76.76"
                />
              </FormField>

              <FormField label="Subject Authority Code">
                <Input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. QA.COMP.04"
                />
              </FormField>
            </div>
          </Card>
        </div>

        {/* Right 1 Col: Live Cover Preview & Quick Actions */}
        <div className="space-y-6">
          <Card variant="default">
            <h3 className="text-sm font-semibold text-canvas-text mb-3">Live Cover Preview</h3>

            <div className="flex justify-center p-4 rounded-xl bg-canvas-subtle border border-border-subtle">
              <BookCover
                title={title || 'Untitiled Book Title'}
                author={authors || 'Author Name'}
                category={category}
                coverUrl={coverUrl}
                size="lg"
                className="shadow-lg"
              />
            </div>

            <div className="mt-4 space-y-3">
              <FormField label="Cover Image URL (HTTPS)">
                <Input
                  type="url"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="https://... cover image"
                />
              </FormField>
              <p className="text-[11px] text-canvas-muted">
                Leave blank to automatically render LIBFLOW's procedural typography cover.
              </p>
            </div>
          </Card>

          {/* Save Action Card */}
          <div className="p-5 rounded-xl border border-border-subtle bg-surface shadow-card space-y-3">
            <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-canvas-muted">
              Accession Confirmation
            </h4>
            <p className="text-xs text-canvas-muted leading-relaxed">
              Saving creates the title record. You can accession individual physical copies immediately afterwards.
            </p>

            <div className="space-y-2 pt-2">
              <Button
                variant="primary"
                size="md"
                leftIcon={<Save className="w-4 h-4" />}
                onClick={() => handleSave(false)}
                isLoading={isSubmitting}
                className="w-full justify-center text-xs shadow-ambient"
              >
                Save Bibliographic Record
              </Button>

              <Button
                variant="secondary"
                size="md"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => handleSave(true)}
                isLoading={isSubmitting}
                className="w-full justify-center text-xs"
              >
                Save & Add Physical Copies
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
