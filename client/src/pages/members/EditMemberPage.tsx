import React, { useState, useEffect } from 'react';
import { useMembers } from '../../features/members/MembersContext';
import type { MemberType } from '../../features/members/types';
import { FormField, Input, Select } from '../../components/forms/FormControls';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../auth/AuthContext';
import {
  ArrowLeft,
  Save,
  Lock,
  IdCard,
  Mail,
  GraduationCap,
  Sparkles,
  BookOpen,
  AlertCircle,
} from 'lucide-react';
import { MemberStatusBadge } from '../../features/members/components/MemberStatusBadge';

import { Spinner, Alert } from '../../components/feedback/FeedbackStates';
import { ApiClientError } from '../../lib/api/types';

export interface EditMemberPageProps {
  memberId: string;
  onNavigate: (path: string) => void;
}

export const EditMemberPage: React.FC<EditMemberPageProps> = ({ memberId, onNavigate }) => {
  const { getMemberById, fetchMemberById, updateMember } = useMembers();
  const { addToast } = useToast();
  const { role, authMode } = useAuth();
  const isAdmin = role === 'ADMIN';

  const [member, setMember] = useState<any>(() => getMemberById(memberId));
  const [isFetching, setIsFetching] = useState<boolean>(!member && authMode === 'live');

  // Form State
  const [firstName, setFirstName] = useState(() => member?.firstName || '');
  const [lastName, setLastName] = useState(() => member?.lastName || '');
  const [email, setEmail] = useState(() => member?.email || '');
  const [phone, setPhone] = useState(() => member?.phone || '');
  const [address, setAddress] = useState(() => member?.address || '');
  const [memberType, setMemberType] = useState<MemberType>(() => member?.memberType || 'STUDENT');
  const [department, setDepartment] = useState(() => member?.department || '');
  const [program, setProgram] = useState(() => member?.program || '');
  const [academicYear, setAcademicYear] = useState(() => member?.academicYear || 'Year 1');
  const [membershipExpiryDate, setMembershipExpiryDate] = useState(
    () => member?.membershipExpiryDate || ''
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync member if fetched or updated
  useEffect(() => {
    const cached = getMemberById(memberId);
    if (cached) {
      setMember(cached);
      setFirstName(cached.firstName);
      setLastName(cached.lastName);
      setEmail(cached.email);
      setPhone(cached.phone);
      setAddress(cached.address);
      setMemberType(cached.memberType);
      setDepartment(cached.department);
      setProgram(cached.program);
      setAcademicYear(cached.academicYear || 'Year 1');
      setMembershipExpiryDate(cached.membershipExpiryDate);
    } else if (authMode === 'live') {
      setIsFetching(true);
      fetchMemberById(memberId)
        .then((m) => {
          if (m) {
            setMember(m);
            setFirstName(m.firstName);
            setLastName(m.lastName);
            setEmail(m.email);
            setPhone(m.phone);
            setAddress(m.address);
            setMemberType(m.memberType);
            setDepartment(m.department);
            setProgram(m.program);
            setAcademicYear(m.academicYear || 'Year 1');
            setMembershipExpiryDate(m.membershipExpiryDate);
          }
        })
        .finally(() => setIsFetching(false));
    }
  }, [memberId, authMode, getMemberById, fetchMemberById]);

  const basePath = isAdmin ? 'admin/members' : 'librarian/members';

  if (isFetching) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3 bg-surface/50 rounded-2xl border border-border-subtle">
        <Spinner size="lg" />
        <p className="text-xs text-canvas-muted font-mono">Loading patron profile details...</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="max-w-xl mx-auto p-12 rounded-2xl border border-border-subtle bg-surface text-center space-y-4 shadow-card">
        <h2 className="text-lg font-serif font-bold text-canvas-text">Patron Record Not Found</h2>
        <p className="text-xs text-canvas-muted">
          The requested patron record with ID &quot;{memberId}&quot; does not exist or was deregistered.
        </p>
        <Button variant="secondary" size="sm" onClick={() => onNavigate(basePath)}>
          Return to Member Directory
        </Button>
      </div>
    );
  }

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};
    if (!firstName.trim()) nextErrors.firstName = 'First name is required.';
    if (!lastName.trim()) nextErrors.lastName = 'Last name is required.';
    if (!email.trim()) {
      nextErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (!phone.trim()) nextErrors.phone = 'Phone number is required.';
    if (!department.trim()) nextErrors.department = 'Department is required.';
    if (!program.trim()) nextErrors.program = 'Degree program / title is required.';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      addToast({
        title: 'Validation Error',
        message: 'Please resolve required fields before updating member.',
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);
    setApiError(null);

    try {
      const updated = await updateMember(member.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        memberType,
        department: department.trim(),
        program: program.trim(),
        academicYear: academicYear.trim(),
        membershipExpiryDate,
      });

      addToast({
        title: 'Profile Updated',
        message: `Updated profile details for ${updated?.fullName || member.fullName}.`,
        type: 'success',
      });

      onNavigate(`${basePath}/${member.id}`);
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : (err as Error).message || 'Could not save member profile changes.';
      setApiError(message);
      addToast({
        title: 'Update Error',
        message,
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fullNamePreview = firstName.trim() || lastName.trim()
    ? `${firstName.trim()} ${lastName.trim()}`
    : member.fullName;

  const initialsPreview = firstName.trim() || lastName.trim()
    ? `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
    : member.initials;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate(`${basePath}/${member.id}`)}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            className="text-xs font-mono"
          >
            Patron Profile
          </Button>
          <div className="h-4 w-px bg-border-subtle" />
          <div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-canvas-text tracking-tight">
              Edit Patron Profile — {member.fullName}
            </h1>
            <p className="text-xs text-canvas-muted">
              Update institutional contact information, academic affiliation, and valid expiry date.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate(`${basePath}/${member.id}`)}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
            leftIcon={<Save className="w-3.5 h-3.5" />}
            className="text-xs shadow-sm"
          >
            {isSubmitting ? 'Saving...' : 'Save Profile Changes'}
          </Button>
        </div>
      </div>

      {/* Profile Update API Error Banner */}
      {apiError && (
        <Alert
          variant="error"
          title="Profile Update Failed"
          description={apiError}
        />
      )}

      {/* 2-Column Desktop Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Form Sections (7 cols) */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-6">
          {/* SECTION 1: Personal Identity */}
          <div className="p-6 rounded-2xl border border-border-subtle bg-surface shadow-card space-y-4">
            <div className="border-b border-border-subtle pb-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-brand font-bold block">
                Section 01
              </span>
              <h2 className="text-sm font-semibold text-canvas-text flex items-center gap-2">
                <IdCard className="w-4 h-4 text-brand" />
                Personal Identity
              </h2>
              <p className="text-xs text-canvas-muted mt-0.5">
                Patron legal name and registered identity.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="First Name" required error={errors.firstName}>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  hasError={!!errors.firstName}
                />
              </FormField>

              <FormField label="Last Name" required error={errors.lastName}>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  hasError={!!errors.lastName}
                />
              </FormField>
            </div>
          </div>

          {/* SECTION 2: Contact Information */}
          <div className="p-6 rounded-2xl border border-border-subtle bg-surface shadow-card space-y-4">
            <div className="border-b border-border-subtle pb-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-brand font-bold block">
                Section 02
              </span>
              <h2 className="text-sm font-semibold text-canvas-text flex items-center gap-2">
                <Mail className="w-4 h-4 text-brand" />
                Contact Details
              </h2>
              <p className="text-xs text-canvas-muted mt-0.5">
                Official institutional email and phone number for circulation notifications.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Institutional Email" required error={errors.email}>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    hasError={!!errors.email}
                  />
                </FormField>

                <FormField label="Phone Number" required error={errors.phone}>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    hasError={!!errors.phone}
                  />
                </FormField>
              </div>

              <FormField label="Campus Residence / Mailing Address">
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </FormField>
            </div>
          </div>

          {/* SECTION 3: Academic Organization */}
          <div className="p-6 rounded-2xl border border-border-subtle bg-surface shadow-card space-y-4">
            <div className="border-b border-border-subtle pb-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-brand font-bold block">
                Section 03
              </span>
              <h2 className="text-sm font-semibold text-canvas-text flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-brand" />
                Academic & Department Standing
              </h2>
              <p className="text-xs text-canvas-muted mt-0.5">
                Classification and institutional division.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Member Classification" required>
                <Select
                  value={memberType}
                  onChange={(e) => setMemberType(e.target.value as MemberType)}
                  options={[
                    { value: 'STUDENT', label: 'Student (Undergraduate / Graduate)' },
                    { value: 'FACULTY', label: 'Faculty / Instructional Staff' },
                    { value: 'STAFF', label: 'University Administrative Staff' },
                    { value: 'EXTERNAL', label: 'External Research Fellow' },
                  ]}
                />
              </FormField>

              <FormField label="Department" required error={errors.department}>
                <Input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  hasError={!!errors.department}
                />
              </FormField>

              <FormField label="Program / Title" required error={errors.program}>
                <Input
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                  hasError={!!errors.program}
                />
              </FormField>

              <FormField label="Academic Cohort">
                <Input
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                />
              </FormField>
            </div>
          </div>

          {/* SECTION 4: Validity Window */}
          <div className="p-6 rounded-2xl border border-border-subtle bg-surface shadow-card space-y-4">
            <div className="border-b border-border-subtle pb-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-brand font-bold block">
                Section 04
              </span>
              <h2 className="text-sm font-semibold text-canvas-text">
                Membership Validity Window
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Patron Member ID" description="Immutable system identifier">
                <Input value={member.memberId} disabled className="font-mono bg-canvas-subtle font-bold text-brand" />
              </FormField>

              <FormField label="Term Expiry Date">
                <Input
                  type="date"
                  value={membershipExpiryDate}
                  onChange={(e) => setMembershipExpiryDate(e.target.value)}
                />
              </FormField>
            </div>
          </div>
        </form>

        {/* Right Column: Live Smartcard & Locked Circulation Metrics (5 cols) */}
        <div className="lg:col-span-5 sticky top-24 space-y-5">
          <div className="flex items-center justify-between text-xs text-canvas-muted px-1">
            <span className="font-mono uppercase tracking-wider font-semibold text-brand flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Patron Smartcard
            </span>
            <MemberStatusBadge status={member.status} size="sm" />
          </div>

          {/* Smartcard Visual */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-surface to-canvas-subtle border-2 border-border-strong shadow-elevated relative overflow-hidden space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-brand text-brand-foreground font-serif font-bold text-xs flex items-center justify-center">
                  L
                </div>
                <span className="font-serif font-bold text-sm tracking-tight text-canvas-text">
                  LIBFLOW SMARTCARD
                </span>
              </div>
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-brand/10 text-brand border border-brand/20">
                {memberType}
              </span>
            </div>

            <div className="flex items-center gap-4 pt-1">
              <div className="w-14 h-14 rounded-2xl bg-brand/10 border-2 border-brand/30 text-brand font-mono font-bold text-lg flex items-center justify-center shrink-0 shadow-inner">
                {initialsPreview}
              </div>
              <div className="min-w-0">
                <h3 className="font-serif font-bold text-base sm:text-lg text-canvas-text truncate">
                  {fullNamePreview}
                </h3>
                <span className="text-xs text-canvas-muted block truncate">
                  {department.replace('Department of ', '')}
                </span>
                <span className="text-[11px] font-mono text-brand font-medium">
                  {academicYear} • {program}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-border-subtle/80 space-y-3">
              <div className="flex items-center justify-between font-mono text-xs">
                <div>
                  <span className="text-[9px] uppercase text-canvas-muted block">Patron ID</span>
                  <span className="font-bold text-canvas-text text-sm tracking-wider">{member.memberId}</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase text-canvas-muted block">Expires</span>
                  <span className="font-bold text-canvas-text">{membershipExpiryDate}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-canvas-subtle border border-border-subtle flex flex-col items-center justify-center gap-1">
                <div className="flex items-center justify-center gap-[2px] h-7 w-full max-w-[200px]">
                  {Array.from({ length: 38 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-full bg-canvas-text rounded-xs"
                      style={{
                        width: i % 4 === 0 ? '3px' : i % 2 === 0 ? '1.5px' : '2px',
                        opacity: i % 5 === 0 ? 0.9 : 0.75,
                      }}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-mono text-canvas-muted tracking-widest uppercase">
                  *{member.memberId}*
                </span>
              </div>
            </div>
          </div>

          {/* Mandatory Lock Notice: Core Architectural Rule */}
          <div className="p-5 rounded-2xl border border-border-subtle bg-surface shadow-ambient space-y-3">
            <div className="flex items-center gap-2 text-canvas-text font-semibold text-xs border-b border-border-subtle pb-2">
              <Lock className="w-3.5 h-3.5 text-brand" />
              <span>Calculated Activity Ledger (Read-Only)</span>
            </div>

            <p className="text-[11px] text-canvas-muted leading-relaxed">
              In accordance with library domain integrity rules, circulation metrics cannot be edited manually. They are strictly calculated from circulation transactions.
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
              <div className="p-2 rounded-lg bg-canvas-subtle border border-border-subtle/60">
                <span className="text-[9px] text-canvas-muted uppercase block">Active Loans</span>
                <span className="font-bold text-canvas-text flex items-center gap-1">
                  <BookOpen className="w-3 h-3 text-brand" />
                  {member.activeLoansCount} Volumes
                </span>
              </div>

              <div className="p-2 rounded-lg bg-canvas-subtle border border-border-subtle/60">
                <span className="text-[9px] text-canvas-muted uppercase block">Overdue</span>
                <span className={`font-bold flex items-center gap-1 ${member.overdueCount > 0 ? 'text-rose-600' : 'text-canvas-muted'}`}>
                  <AlertCircle className="w-3 h-3" />
                  {member.overdueCount} Items
                </span>
              </div>

              <div className="p-2 rounded-lg bg-canvas-subtle border border-border-subtle/60">
                <span className="text-[9px] text-canvas-muted uppercase block">Total Borrowed</span>
                <span className="font-bold text-canvas-text">
                  {member.totalBooksBorrowed} Books
                </span>
              </div>

              <div className="p-2 rounded-lg bg-canvas-subtle border border-border-subtle/60">
                <span className="text-[9px] text-canvas-muted uppercase block">Outstanding</span>
                <span className="font-bold text-canvas-text">
                  ${member.outstandingFine.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
