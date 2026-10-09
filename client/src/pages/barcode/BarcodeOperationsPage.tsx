import React, { useState } from 'react';
import { useBooks } from '../../features/books/BooksContext';
import { useMembers } from '../../features/members/MembersContext';
import { useCirculation } from '../../features/circulation/CirculationContext';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../context/ToastContext';
import { BarcodeScanner } from '../../features/barcode/components/BarcodeScanner';
import { ScanResultCard, type ScanCardActionType } from '../../features/barcode/components/ScanResultCard';
import { PrintLabelModal } from '../../features/barcode/components/PrintLabelModal';
import { resolveBarcodeInput } from '../../features/barcode/barcodeSelectors';
import type { BarcodeScanResult } from '../../features/barcode/types';
import type { Book, BookCopy } from '../../features/books/types';
import {
  Barcode,
  History,
  CheckCircle2,
  AlertTriangle,
  Repeat,
  RotateCcw,
  Trash2,
} from 'lucide-react';

export interface BarcodeOperationsPageProps {
  onNavigate: (path: string) => void;
}

export const BarcodeOperationsPage: React.FC<BarcodeOperationsPageProps> = ({ onNavigate }) => {
  const { books, copies } = useBooks();
  const { members } = useMembers();
  const { loans } = useCirculation();
  const { role } = useAuth();
  const { addToast } = useToast();

  // Active scan result
  const [activeResult, setActiveResult] = useState<BarcodeScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<BarcodeScanResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Print Label Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printCopy, setPrintCopy] = useState<BookCopy | null>(null);
  const [printBook, setPrintBook] = useState<Book | null>(null);

  const handleScan = (rawBarcode: string) => {
    setIsProcessing(true);
    const result = resolveBarcodeInput(rawBarcode, { books, copies, members, loans });
    setActiveResult(result);
    setScanHistory((prev) => [result, ...prev.slice(0, 19)]); // Keep last 20 scans
    setIsProcessing(false);

    if (result.found) {
      addToast({
        title: 'Barcode Resolved',
        message: result.message || `Identified ${result.rawCode}`,
        type: 'success',
      });
    } else {
      addToast({
        title: 'Barcode Not Found',
        message: result.message || 'Item not registered in accession catalog.',
        type: 'warning',
      });
    }
  };

  const handleCardAction = (action: ScanCardActionType, result: BarcodeScanResult) => {
    const circBase = role === 'ADMIN' ? 'admin/circulation' : 'librarian/circulation';

    switch (action) {
      case 'CHECKOUT':
        if (result.entityType === 'BOOK_COPY' && result.bookCopy) {
          onNavigate(`${circBase}/checkout`);
        } else if (result.entityType === 'MEMBER' && result.member) {
          onNavigate(`${circBase}/checkout?memberId=${result.member.memberId}`);
        }
        break;

      case 'RETURN':
        if (result.bookCopy) {
          onNavigate(`${circBase}/return`);
        }
        break;

      case 'VIEW_BOOK':
        if (result.book) {
          const booksBase = role === 'ADMIN' ? 'admin/collection/books' : 'librarian/collection/books';
          onNavigate(`${booksBase}/${result.book.id}`);
        }
        break;

      case 'VIEW_MEMBER':
        if (result.member) {
          const membersBase = role === 'ADMIN' ? 'admin/members' : 'librarian/members';
          onNavigate(`${membersBase}/${result.member.id}`);
        }
        break;

      case 'VIEW_FINES':
        if (result.member) {
          onNavigate('librarian/operations/fines');
        }
        break;

      case 'PRINT_LABEL':
        if (result.bookCopy && result.book) {
          setPrintCopy(result.bookCopy);
          setPrintBook(result.book);
          setIsPrintModalOpen(true);
        }
        break;

      default:
        break;
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border-subtle">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-brand font-bold block mb-1">
            Accession & Desk Scanning
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-canvas-text tracking-tight">
            Barcode & QR Operations Center
          </h1>
          <p className="text-xs sm:text-sm text-canvas-muted mt-0.5">
            Real-time physical copy accession lookup, member smartcard resolution, and label generation.
          </p>
        </div>

        {/* Quick Circulation Desk Shortcuts */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onNavigate(role === 'ADMIN' ? 'admin/circulation/checkout' : 'librarian/circulation/checkout')}
            className="px-3 py-1.5 rounded-lg border border-border-subtle bg-surface text-canvas-text hover:bg-canvas-subtle transition-colors text-xs font-medium flex items-center gap-1.5"
          >
            <Repeat className="w-3.5 h-3.5 text-brand" />
            <span>Check Out Terminal</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate(role === 'ADMIN' ? 'admin/circulation/return' : 'librarian/circulation/return')}
            className="px-3 py-1.5 rounded-lg border border-border-subtle bg-surface text-canvas-text hover:bg-canvas-subtle transition-colors text-xs font-medium flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
            <span>Check In (Return)</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Scanner Left, Results & History Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Scanner */}
        <div className="lg:col-span-7 space-y-6">
          <BarcodeScanner
            onScan={handleScan}
            isProcessing={isProcessing}
          />
        </div>

        {/* Right Column: Scan Resolution & History */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active Scan Result */}
          {activeResult ? (
            <ScanResultCard
              result={activeResult}
              onAction={handleCardAction}
              onClear={() => setActiveResult(null)}
            />
          ) : (
            <div className="p-8 rounded-2xl border border-dashed border-border-strong bg-surface/40 text-center space-y-2 select-none">
              <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand mx-auto">
                <Barcode className="w-6 h-6" />
              </div>
              <h4 className="font-serif font-bold text-sm text-canvas-text">
                Waiting for Scan Input
              </h4>
              <p className="text-xs text-canvas-muted max-w-xs mx-auto">
                Trigger an optical scan with your scanner gun, enter a barcode manually, or use the 1-click test simulation pickers.
              </p>
            </div>
          )}

          {/* Session Scan History Ledger */}
          <div className="rounded-2xl border border-border-subtle bg-surface p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <div className="flex items-center gap-2 text-xs font-semibold text-canvas-text">
                <History className="w-4 h-4 text-canvas-muted" />
                <span>Session Scan History ({scanHistory.length})</span>
              </div>

              {scanHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => setScanHistory([])}
                  className="text-[11px] font-mono text-canvas-muted hover:text-rose-500 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {scanHistory.length === 0 ? (
              <p className="text-xs text-canvas-muted py-4 text-center">
                Zero items scanned in this session yet.
              </p>
            ) : (
              <div className="divide-y divide-border-subtle/50 max-h-80 overflow-y-auto">
                {scanHistory.map((item, idx) => (
                  <div
                    key={`${item.rawCode}-${idx}`}
                    onClick={() => setActiveResult(item)}
                    className="py-2.5 px-2 flex items-center justify-between hover:bg-canvas-subtle rounded-lg cursor-pointer transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {item.found ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      )}
                      <div className="truncate">
                        <span className="font-mono font-bold text-canvas-text block truncate">
                          {item.rawCode}
                        </span>
                        <span className="text-[11px] text-canvas-muted truncate block">
                          {item.book?.title || item.member?.fullName || item.message}
                        </span>
                      </div>
                    </div>

                    <span className="font-mono text-[10px] text-canvas-muted shrink-0 ml-2">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Print Label Modal */}
      <PrintLabelModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        copy={printCopy}
        book={printBook}
      />
    </div>
  );
};
