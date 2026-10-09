import React, { useState } from 'react';
import type { Member } from '../../members/types';
import { MemberStatusBadge, MemberTypeBadge } from '../../members/components/MemberStatusBadge';
import { BarcodeDisplay } from './BarcodeDisplay';
import { QRCodeDisplay } from './QRCodeDisplay';
import { Button } from '../../../components/ui/Button';
import {
  Printer,
  Copy,
  Check,
  Radio,
  BookOpen,
} from 'lucide-react';

export interface DigitalIdCardProps {
  member: Member;
  className?: string;
  showActions?: boolean;
}

export const DigitalIdCard: React.FC<DigitalIdCardProps> = ({
  member,
  className = '',
  showActions = true,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard?.writeText(member.memberId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const qrPayload = JSON.stringify({
    type: 'member',
    memberId: member.memberId,
    name: member.fullName,
    dept: member.department,
    status: member.status,
  });

  return (
    <div className={`space-y-4 max-w-md mx-auto ${className}`}>
      {/* Wallet Pass / Smartcard Surface */}
      <div className="relative rounded-3xl p-6 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white border-2 border-indigo-500/30 shadow-2xl overflow-hidden select-none">
        {/* Holographic Watermark Accents */}
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 rounded-full bg-brand/20 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-48 h-48 rounded-full bg-cyan-500/15 blur-2xl pointer-events-none" />

        {/* Card Header */}
        <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand flex items-center justify-center text-white shadow-md">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="font-mono text-[10px] tracking-widest text-sky-300 font-bold uppercase block">
                LIBFLOW SMARTCARD
              </span>
              <span className="text-[10px] text-slate-300 tracking-wide font-medium">
                Central University Library
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <Radio className="w-3 h-3 animate-pulse" />
            <span>RFID ACTIVE</span>
          </div>
        </div>

        {/* Member Profile Block */}
        <div className="relative z-10 mt-5 flex items-start gap-4">
          {/* Avatar / Photo with chip simulation */}
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand to-indigo-600 border-2 border-white/20 flex items-center justify-center text-white font-bold text-xl shadow-lg">
              {member.initials || member.fullName.slice(0, 2).toUpperCase()}
            </div>
            {/* Smartcard EMV Microchip Gold Stamp */}
            <div className="w-5 h-4 rounded-sm bg-gradient-to-tr from-amber-300 via-yellow-400 to-amber-200 border border-yellow-600/50 absolute -bottom-1 -right-1 shadow-xs flex items-center justify-center">
              <div className="w-3 h-2 border-t border-b border-yellow-700/60" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <h3 className="font-serif font-bold text-lg text-white truncate">
                {member.fullName}
              </h3>
            </div>
            <p className="text-xs text-sky-200 font-medium truncate mt-0.5">
              {member.department}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              {member.program || 'Undergraduate Degree'}
            </p>

            <div className="mt-2 flex items-center gap-2">
              <MemberTypeBadge type={member.memberType} />
              <MemberStatusBadge status={member.status} size="sm" />
            </div>
          </div>
        </div>

        {/* Barcode & QR Code Identification Row */}
        <div className="relative z-10 mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/5 rounded-2xl p-4 backdrop-blur-xs">
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
            <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400 block mb-1">
              Patron Smartcard Barcode
            </span>
            <BarcodeDisplay
              value={member.memberId}
              size="sm"
              showText={true}
              className="bg-transparent border-none p-0 text-white"
            />
          </div>

          <div className="shrink-0 flex flex-col items-center">
            <QRCodeDisplay
              value={qrPayload}
              size="sm"
              includeBorder={false}
              className="bg-transparent border-none p-0"
            />
          </div>
        </div>

        {/* Card Footer Details */}
        <div className="relative z-10 mt-4 flex items-center justify-between text-[10px] font-mono text-slate-400 pt-2 border-t border-white/10">
          <div>
            <span>ID: </span>
            <strong className="text-white">{member.memberId}</strong>
          </div>
          <div>
            <span>VALID THRU: </span>
            <strong className="text-white">{member.membershipExpiryDate || '2027-06-30'}</strong>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      {showActions && (
        <div className="flex items-center justify-center gap-3 pt-1 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyId}
            className="gap-1.5"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'ID Copied' : 'Copy Member ID'}</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Print ID Pass</span>
          </Button>
        </div>
      )}
    </div>
  );
};
