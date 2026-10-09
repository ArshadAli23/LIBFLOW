import React, { useState } from 'react';
import type { Book, BookCopy } from '../../books/types';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { BarcodeDisplay } from './BarcodeDisplay';
import { QRCodeDisplay } from './QRCodeDisplay';
import { Printer, Check, Copy } from 'lucide-react';

export interface PrintLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  copy: BookCopy | null;
  book: Book | null;
}

export const PrintLabelModal: React.FC<PrintLabelModalProps> = ({
  isOpen,
  onClose,
  copy,
  book,
}) => {
  const [labelFormat, setLabelFormat] = useState<'standard' | 'spine' | 'pocket'>('standard');
  const [copied, setCopied] = useState(false);

  if (!copy || !book) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyBarcode = () => {
    navigator.clipboard?.writeText(copy.barcode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const qrPayload = JSON.stringify({
    type: 'book-copy',
    copyId: copy.id,
    barcode: copy.barcode,
    bookId: copy.bookId,
    callNumber: book.callNumber || 'QA76.6',
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Print Physical Copy Label"
      description={`Generate accession sticker & spine tag for ${copy.barcode}`}
      size="md"
      footer={
        <div className="flex items-center justify-between w-full print:hidden">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyBarcode}
              className="gap-1.5"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print Label Sheet</span>
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Format Selector Pills */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-canvas-subtle border border-border-subtle text-xs print:hidden">
          <button
            type="button"
            onClick={() => setLabelFormat('standard')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-colors ${
              labelFormat === 'standard'
                ? 'bg-surface text-canvas-text shadow-xs font-bold'
                : 'text-canvas-muted hover:text-canvas-text'
            }`}
          >
            Accession & Shelf Label
          </button>
          <button
            type="button"
            onClick={() => setLabelFormat('spine')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-colors ${
              labelFormat === 'spine'
                ? 'bg-surface text-canvas-text shadow-xs font-bold'
                : 'text-canvas-muted hover:text-canvas-text'
            }`}
          >
            Spine Tag
          </button>
          <button
            type="button"
            onClick={() => setLabelFormat('pocket')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-colors ${
              labelFormat === 'pocket'
                ? 'bg-surface text-canvas-text shadow-xs font-bold'
                : 'text-canvas-muted hover:text-canvas-text'
            }`}
          >
            Pocket Card
          </button>
        </div>

        {/* Physical Sticker Card Preview */}
        <div className="p-6 rounded-2xl bg-white text-slate-900 border-2 border-dashed border-slate-300 shadow-sm print:border-none print:shadow-none space-y-4 text-center select-none">
          {/* Institutional Header */}
          <div className="border-b border-slate-200 pb-2">
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-slate-600 block">
              CENTRAL UNIVERSITY LIBRARY
            </span>
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">
              Physical Circulation Accession
            </span>
          </div>

          {/* Book Info */}
          <div>
            <h4 className="font-serif font-bold text-sm text-slate-900 leading-snug truncate">
              {book.title}
            </h4>
            <p className="text-[11px] text-slate-600 truncate mt-0.5">
              {book.authors.join(', ')}
            </p>
          </div>

          {/* Call Number and Shelf Box */}
          <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-left text-[11px] font-mono">
            <div>
              <span className="text-[9px] text-slate-500 block uppercase">Call Number</span>
              <strong className="text-slate-900">{book.callNumber || 'QA76.6 .H857'}</strong>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block uppercase">Shelf Stack</span>
              <strong className="text-slate-900">{copy.shelf || 'A-03-04'}</strong>
            </div>
          </div>

          {/* Barcode & QR Code Section */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <BarcodeDisplay
              value={copy.barcode}
              size="md"
              showText={true}
              className="bg-transparent border-none shadow-none p-0 text-slate-900"
            />

            {labelFormat !== 'spine' && (
              <div className="border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-4">
                <QRCodeDisplay
                  value={qrPayload}
                  size="sm"
                  includeBorder={false}
                  className="bg-transparent border-none shadow-none p-0"
                />
              </div>
            )}
          </div>

          {/* Footer Accession Stamp */}
          <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-[9px] font-mono text-slate-500">
            <span>Copy #{String(copy.copyNumber).padStart(2, '0')}</span>
            <span>Acc: {copy.barcode}</span>
            <span>{copy.location}</span>
          </div>
        </div>

        <p className="text-[11px] text-canvas-muted text-center print:hidden">
          Standard thermal adhesive label (2.25&quot; x 4&quot;) layout. Ready for thermal transfer or standard desktop label printer.
        </p>
      </div>
    </Modal>
  );
};
