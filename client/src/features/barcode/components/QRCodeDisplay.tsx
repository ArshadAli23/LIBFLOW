import React, { useState, useMemo } from 'react';
import { generateQrMatrix, matrixToSvgPath } from '../barcodeUtils';
import { Copy, Check, QrCode } from 'lucide-react';

export interface QRCodeDisplayProps {
  value: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  includeBorder?: boolean;
  onCopySuccess?: () => void;
  className?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  value,
  label,
  size = 'md',
  includeBorder = true,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  // Generate matrix
  const matrix = useMemo(() => {
    return generateQrMatrix(value);
  }, [value]);

  const svgPath = useMemo(() => {
    return matrixToSvgPath(matrix);
  }, [matrix]);

  const matrixSize = matrix.length;

  // Pixel dimension
  const pixelSize = size === 'sm' ? 100 : size === 'lg' ? 200 : 144;

  const handleCopy = () => {
    navigator.clipboard?.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`inline-flex flex-col items-center p-3 rounded-2xl bg-surface ${
        includeBorder ? 'border border-border-subtle shadow-xs' : ''
      } ${className}`}
      role="region"
      aria-label={`QR Code for ${value}`}
    >
      {label && (
        <span className="text-[10px] font-mono uppercase tracking-wider text-canvas-muted mb-2 font-semibold">
          {label}
        </span>
      )}

      {/* High-Contrast White Background for Reliable Camera Optical Read */}
      <div
        className="p-3 rounded-xl bg-white text-slate-900 border border-slate-200 flex items-center justify-center relative group shadow-2xs"
        style={{ width: pixelSize, height: pixelSize }}
      >
        <svg
          viewBox={`-2 -2 ${matrixSize + 4} ${matrixSize + 4}`}
          className="w-full h-full"
          role="img"
          aria-label={`QR Code representation`}
        >
          {/* Quiet Zone Background */}
          <rect
            x={-2}
            y={-2}
            width={matrixSize + 4}
            height={matrixSize + 4}
            fill="#ffffff"
          />
          {/* Black QR Modules */}
          <path d={svgPath} fill="#0f172a" />
        </svg>

        {/* Floating Quick Copy Overlay on Hover */}
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy QR code payload"
          className="absolute inset-0 bg-slate-900/80 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1"
        >
          {copied ? (
            <>
              <Check className="w-5 h-5 text-emerald-400" />
              <span className="text-[10px] font-mono">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-5 h-5" />
              <span className="text-[10px] font-mono">Copy Payload</span>
            </>
          )}
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between w-full px-1">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-canvas-muted truncate max-w-[130px]">
          <QrCode className="w-3 h-3 text-brand shrink-0" />
          <span className="truncate" title={value}>
            {value.length > 20 ? `${value.slice(0, 18)}...` : value}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="text-[10px] font-mono text-brand hover:underline font-semibold"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
};
