import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../../../components/ui/Button';
import { SAMPLE_SIMULATED_BARCODES, type SimulatedBarcodeSample } from '../barcodeSelectors';
import {
  Barcode,
  Search,
  Volume2,
  VolumeX,
  Sparkles,
  Camera,
  Keyboard,
} from 'lucide-react';

export interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  isProcessing?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onScan,
  isProcessing = false,
  placeholder = 'Scan barcode with gun or enter barcode (e.g. LC-00421)...',
  autoFocus = true,
  className = '',
}) => {
  const [manualInput, setManualInput] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isScanningActive, setIsScanningActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Play crisp scanner beep using Web Audio API
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1850, ctx.currentTime); // Standard 1.85kHz scanner chime
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // AudioContext unavailable or blocked by browser policy
    }
  };

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleTriggerScan = (codeToScan: string) => {
    const clean = codeToScan.trim();
    if (!clean) return;

    setIsScanningActive(true);
    playBeep();

    setTimeout(() => {
      onScan(clean);
      setManualInput('');
      setIsScanningActive(false);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 280);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleTriggerScan(manualInput);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Scanner Visual Optical Target Box */}
      <div className="relative rounded-2xl border border-border-strong bg-slate-950 p-6 text-white overflow-hidden shadow-modal">
        {/* Ambient Grid Lines Background */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* Animated Laser Beam */}
        <div className="relative h-28 sm:h-32 flex flex-col items-center justify-center border border-sky-500/20 rounded-xl bg-slate-900/60 overflow-hidden">
          {/* Top-Left & Bottom-Right Reticle Crosshairs */}
          <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-brand" />
          <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-brand" />
          <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-brand" />
          <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-brand" />

          {/* Glowing Animated Red/Cyan Laser Line */}
          <div
            className={`absolute left-0 right-0 h-0.5 bg-rose-500 shadow-[0_0_12px_#f43f5e] transition-all duration-300 ${
              isScanningActive ? 'animate-bounce opacity-100 scale-105' : 'animate-pulse opacity-75'
            }`}
            style={{ top: '48%' }}
          />

          <div className="relative z-10 flex flex-col items-center text-center space-y-1.5 px-4">
            <Barcode className="w-8 h-8 text-sky-400 opacity-80" />
            <p className="font-mono text-xs text-sky-200 font-semibold tracking-wider">
              {isScanningActive ? 'READING BARCODE OPTICAL STREAM...' : 'OPTICAL DESK SCANNER READY'}
            </p>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Supports continuous USB barcode guns, smartcard readers, and simulated scanning.
            </p>
          </div>
        </div>

        {/* Manual Barcode Text Input Form */}
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col sm:flex-row gap-2 relative z-10">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder={placeholder}
              disabled={isProcessing}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-400 font-mono text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-brand focus:border-transparent transition-all shadow-inner"
            />
            <Keyboard className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={!manualInput.trim() || isProcessing}
            className="gap-1.5"
          >
            <Search className="w-4 h-4" />
            <span>{isProcessing ? 'Resolving...' : 'Lookup Barcode'}</span>
          </Button>

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Mute scanner chime' : 'Enable scanner chime'}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white transition-colors self-center sm:self-auto"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </form>

        {/* Camera Notice Note */}
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-800">
          <span className="flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-sky-400" />
            Camera scanning enabled on supported devices.
          </span>
          <span className="font-mono text-slate-400 hidden sm:inline">
            Press [Enter] to submit
          </span>
        </div>
      </div>

      {/* Instant Simulation Quick-Picker */}
      <div className="p-4 rounded-2xl bg-surface border border-border-subtle shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-canvas-text">
            <Sparkles className="w-4 h-4 text-brand" />
            <span>Simulate Physical Scan (Quick Pickers)</span>
          </div>
          <span className="text-[10px] font-mono text-canvas-muted">
            1-Click Interactive Testing
          </span>
        </div>

        <p className="text-[11px] text-canvas-muted">
          Select any registered library barcode to test the real-time optical resolution pipeline:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {SAMPLE_SIMULATED_BARCODES.map((sample: SimulatedBarcodeSample) => (
            <button
              key={sample.barcode}
              type="button"
              onClick={() => handleTriggerScan(sample.barcode)}
              className="p-2.5 rounded-xl border border-border-subtle bg-canvas-subtle hover:bg-brand/10 hover:border-brand/30 transition-all text-left group flex items-start gap-2.5"
            >
              <div className="w-7 h-7 rounded-lg bg-surface border border-border-subtle flex items-center justify-center text-canvas-muted group-hover:text-brand shrink-0 mt-0.5">
                <Barcode className="w-4 h-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono text-[11px] font-bold text-brand group-hover:underline">
                    {sample.barcode}
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-surface border border-border-subtle text-canvas-muted uppercase">
                    {sample.type === 'BOOK_COPY' ? 'Copy' : 'Member'}
                  </span>
                </div>
                <h5 className="text-xs font-medium text-canvas-text truncate mt-0.5">
                  {sample.label}
                </h5>
                <p className="text-[10px] text-canvas-muted truncate">
                  {sample.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
