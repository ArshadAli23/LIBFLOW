/**
 * LIBFLOW — Add Book Copy Modal
 * 
 * Creates a physical inventory copy for a specific Book.
 * Prominent barcode generation and shelf call assignment.
 */

import React, { useState } from 'react';
import { Barcode, Plus } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { FormField, Input, Textarea, Select } from '../../../components/forms/FormControls';
import { Button } from '../../../components/ui/Button';
import type { Book, BookCopy, CopyCondition, CopyStatus } from '../types';

export interface AddCopyModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book;
  existingCopiesCount: number;
  onAddCopy: (copyData: Omit<BookCopy, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'timeline'>) => void;
}

export const AddCopyModal: React.FC<AddCopyModalProps> = ({
  isOpen,
  onClose,
  book,
  existingCopiesCount,
  onAddCopy,
}) => {
  const nextCopyNum = existingCopiesCount + 1;
  const suggestedBarcode = `LC-00${420 + nextCopyNum}`;

  const [copyNumber, setCopyNumber] = useState<number>(nextCopyNum);
  const [barcode, setBarcode] = useState<string>(suggestedBarcode);
  const [condition, setCondition] = useState<CopyCondition>('NEW');
  const [status, setStatus] = useState<CopyStatus>('AVAILABLE');
  const [location, setLocation] = useState<string>('Main Library');
  const [shelf, setShelf] = useState<string>(book.callNumber ? book.callNumber.slice(0, 7) : 'A-03-01');
  const [acquisitionDate, setAcquisitionDate] = useState<string>('2026-10-08');
  const [acquisitionCost, setAcquisitionCost] = useState<string>('49.99');
  const [notes, setNotes] = useState<string>('');
  const [errors, setErrors] = useState<{ barcode?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) {
      setErrors({ barcode: 'Accession barcode is required.' });
      return;
    }

    onAddCopy({
      bookId: book.id,
      copyNumber: Number(copyNumber) || nextCopyNum,
      barcode: barcode.trim().toUpperCase(),
      status,
      condition,
      location: location.trim() || 'Main Library',
      shelf: shelf.trim() || 'A-01-01',
      acquisitionDate,
      acquisitionCost: parseFloat(acquisitionCost) || 0,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Physical Book Copy"
      description={`Register a new barcoded physical volume for "${book.title}".`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={handleSubmit}
          >
            Accession Copy
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Prominent Visual Barcode Card Preview */}
        <div className="p-4 rounded-xl bg-canvas-subtle border border-border-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0">
              <Barcode className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-canvas-muted uppercase tracking-wider block">
                Accession Barcode Preview
              </span>
              <span className="font-mono text-lg font-bold text-brand tracking-wider">
                {barcode || 'LC-XXXXX'}
              </span>
            </div>
          </div>

          <div className="text-right text-[11px] font-mono text-canvas-muted">
            <div>Parent Title: <strong className="text-canvas-text">{book.title.slice(0, 24)}...</strong></div>
            <div>ISBN: {book.isbn}</div>
          </div>
        </div>

        {/* Form Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <FormField label="Copy Sequential Number" required>
            <Input
              type="number"
              min={1}
              value={copyNumber}
              onChange={(e) => setCopyNumber(parseInt(e.target.value, 10))}
              placeholder="e.g. 1"
            />
          </FormField>

          <FormField label="Accession Barcode ID" error={errors.barcode} required>
            <Input
              type="text"
              value={barcode}
              onChange={(e) => {
                setBarcode(e.target.value);
                setErrors({});
              }}
              placeholder="e.g. LC-00421"
              hasError={!!errors.barcode}
            />
          </FormField>

          <FormField label="Physical Condition">
            <Select
              value={condition}
              onChange={(e) => setCondition(e.target.value as CopyCondition)}
              options={[
                { value: 'NEW', label: 'New (Pristine)' },
                { value: 'EXCELLENT', label: 'Excellent' },
                { value: 'GOOD', label: 'Good (Standard Circulation)' },
                { value: 'FAIR', label: 'Fair (Minor Shelf Wear)' },
                { value: 'POOR', label: 'Poor (Repair Candidate)' },
              ]}
            />
          </FormField>

          <FormField label="Initial Status">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as CopyStatus)}
              options={[
                { value: 'AVAILABLE', label: 'Available for Circulation' },
                { value: 'MAINTENANCE', label: 'Maintenance / Bindery' },
              ]}
            />
          </FormField>

          <FormField label="Storage Location">
            <Input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Main Library, Science Stacks"
            />
          </FormField>

          <FormField label="Shelf Call Identifier">
            <Input
              type="text"
              value={shelf}
              onChange={(e) => setShelf(e.target.value)}
              placeholder="e.g. A-03-04"
            />
          </FormField>

          <FormField label="Acquisition Date">
            <Input
              type="date"
              value={acquisitionDate}
              onChange={(e) => setAcquisitionDate(e.target.value)}
            />
          </FormField>

          <FormField label="Acquisition Cost ($ USD)">
            <Input
              type="number"
              step="0.01"
              value={acquisitionCost}
              onChange={(e) => setAcquisitionCost(e.target.value)}
              placeholder="e.g. 49.99"
            />
          </FormField>
        </div>

        {/* Copy Notes */}
        <FormField label="Accession Notes & Inscriptions (Optional)">
          <Textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Faculty donation, special protective mylar jacket, volume 1 of 2..."
          />
        </FormField>
      </form>
    </Modal>
  );
};
