import React, { useState } from 'react';
import { encodeCode128B } from '../barcodeUtils';
import { Copy, Check, Printer } from 'lucide-react';

export interface BarcodeDisplayProps {
  value: string;
  label?: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  onPrint?: () => void;
  className?: string;
}

export const BarcodeDisplay: React.FC<BarcodeDisplayProps> = ({
  value,
  label,
  subtitle,
  size = 'md',
  showText = true,
  onPrint,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const binaryModules = encodeCode128B(value);

  const handleCopy = () => {
    navigator.clipboard?.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Dimensions based on size
  const barHeight = size === 'sm' ? 36 : size === 'lg' ? 64 : 48;
  const moduleWidth = size === 'sm' ? 1.4 : size === 'lg' ? 2.2 : 1.8;
  const totalWidth = binaryModules.length * moduleWidth;

  return (
    <div
      className={`inline-flex flex-col items-center p-3 rounded-xl bg-surface border border-border-subtle shadow-xs select-none ${className}`}
      role="region"
      aria-label={`Barcode ${value}`}
    >
      {label && (
        <span className="text-[10px] font-mono uppercase tracking-wider text-canvas-muted mb-1 font-semibold">
          {label}
        </span>
      )}

      {/* SVG Barcode Canvas */}
      <div className="p-2 rounded-lg bg-white text-slate-900 border border-slate-200 flex items-center justify-center">
        <svg
          width={totalWidth}
          height={barHeight}
          viewBox={`0 0 ${totalWidth} ${barHeight}`}
          className="overflow-visible"
          role="img"
          aria-label={`Barcode representation of ${value}`}
        >
          {binaryModules.split('').map((bit, idx) => {
            if (bit === '1') {
              return (
                <rect
                  key={idx}
                  x={idx * moduleWidth}
                  y={0}
                  width={moduleWidth}
                  height={barHeight}
                  fill="#0f172a"
                />
              );
            }
            return null;
          })}
        </svg>
      </div>

      {/* Human Readable Label */}
      {showText && (
        <div className="mt-2 flex items-center justify-between w-full px-1 gap-2">
          <span className="font-mono text-xs font-bold tracking-widest text-canvas-text">
            {value}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCopy}
              title="Copy barcode"
              aria-label="Copy barcode value"
              className="p-1 rounded text-canvas-muted hover:text-brand hover:bg-canvas-subtle transition-colors"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>

            {onPrint && (
              <button
                type="button"
                onClick={onPrint}
                title="Print barcode label"
                aria-label="Print barcode label"
                className="p-1 rounded text-canvas-muted hover:text-brand hover:bg-canvas-subtle transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {subtitle && (
        <span className="text-[10px] text-canvas-muted mt-0.5">
          {subtitle}
        </span>
      )}
    </div>
  );
};
