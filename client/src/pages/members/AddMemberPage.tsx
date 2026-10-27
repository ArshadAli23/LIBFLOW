import React, { useState } from 'react';
import { useMembers } from '../../features/members/MembersContext';
import type { MemberType, MemberStatus } from '../../features/members/types';
import { FormField, Input, Select } from '../../components/forms/FormControls';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/feedback/FeedbackStates';
import { useToast } from '../../context/ToastContext';
import { ApiClientError } from '../../lib/api/types';
import {
  ArrowLeft,
  UserPlus,
  Shield,
  IdCard,
  Building,
  Mail,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

export interface AddMemberPageProps {
  onNavigate: (path: string) => void;
}

export const AddMemberPage: React.FC<AddMemberPageProps> = ({ onNavigate }) => {
  const { members, addMember } = useMembers();
  const { addToast } = useToast();

  // Deterministically compute next Member ID: MEM-2026-XXX
  const generatedMemberId = React.useMemo(() => {
    const existingNums = members
      .map((m) => {
        const match = m.memberId.match(/MEM-2026-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => n > 0);
    const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 14;
    return `MEM-2026-${String(maxNum + 1).padStart(3, '0')}`;
  }, [members]);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [memberType, setMemberType] = useState<MemberType>('STUDENT');
  const [department, setDepartment] = useState('Department of Computer Science');
  const [program, setProgram] = useState('');
  const [academicYear, setAcademicYear] = useState('Year 1');
  const status: MemberStatus = 'ACTIVE';
  const [membershipStartDate, setMembershipStartDate] = useState('2026-10-08');
  const [membershipExpiryDate, setMembershipExpiryDate] = useState('2027-06-30');

  // Errors state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};

    if (!firstName.trim()) nextErrors.firstName = 'First name is required.';
    if (!lastName.trim()) nextErrors.lastName = 'Last name is required.';
    if (!email.trim()) {
      nextErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = 'Enter a valid institutional email address.';
    }
    if (!phone.trim()) nextErrors.phone = 'Phone number is required.';
    if (!department.trim()) nextErrors.department = 'Academic department is required.';
    if (!program.trim()) nextErrors.program = 'Academic degree program or job title is required.';
    if (!membershipStartDate) nextErrors.membershipStartDate = 'Start date is required.';
    if (!membershipExpiryDate) nextErrors.membershipExpiryDate = 'Expiry date is required.';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      addToast({
        title: 'Validation Failed',
        message: 'Please resolve required fields before saving member.',
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);
    setApiError(null);

    try {
      const created = await addMember({
        memberId: generatedMemberId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        memberType,
        department: department.trim(),
        program: program.trim(),
        academicYear: academicYear.trim(),
        status,
        registrationDate: membershipStartDate,
        membershipStartDate,
        membershipExpiryDate,
      });

      addToast({
        title: 'Member Registered Successfully',
        message: `${created.fullName} was enrolled with ID ${created.memberId}.`,
        type: 'success',
      });

      onNavigate(`admin/members/${created.id}`);
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : (err as Error).message || 'An error occurred while creating the member record.';
      setApiError(message);
      addToast({
        title: 'Registration Error',
        message,
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fullNamePreview = firstName.trim() || lastName.trim()
    ? `${firstName.trim()} ${lastName.trim()}`
    : 'New Patron Candidate';

  const initialsPreview = firstName.trim() || lastName.trim()
    ? `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
    : 'LIB';

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('admin/members')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            className="text-xs font-mono"
          >
            Members Directory
          </Button>
          <div className="h-4 w-px bg-border-subtle" />
          <div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-canvas-text tracking-tight">
              Register Library Member
            </h1>
            <p className="text-xs text-canvas-muted">
              Enroll institutional patron with automated credential pairing and circulation tier.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('admin/members')}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
            leftIcon={<UserPlus className="w-3.5 h-3.5" />}
            className="text-xs shadow-sm"
          >
            {isSubmitting ? 'Enrolling...' : 'Save & Issue Credentials'}
          </Button>
        </div>
      </div>

      {/* Registration API Error Banner */}
      {apiError && (
        <Alert
          variant="error"
          title="Registration Failed"
          description={apiError}
        />
      )}

      {/* 2-Column Desktop Layout: Form on Left, Live Smartcard Preview on Right */}
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
                Legal student or faculty identity registered with university records.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="First Name" required error={errors.firstName}>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Arshad"
                  hasError={!!errors.firstName}
                />
              </FormField>

              <FormField label="Last Name" required error={errors.lastName}>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Ali"
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
                Official institutional email for automated due alerts and overdue notices.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Institutional Email" required error={errors.email}>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. arshad.ali@university.edu"
                    hasError={!!errors.email}
                  />
                </FormField>

                <FormField label="Phone Number" required error={errors.phone}>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +1 (555) 234-5678"
                    hasError={!!errors.phone}
                  />
                </FormField>
              </div>

              <FormField label="Campus Residence / Mailing Address">
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Oak Hall Dormitory, Suite 302, North Campus"
                />
              </FormField>
            </div>
          </div>

          {/* SECTION 3: Academic / Organization */}
          <div className="p-6 rounded-2xl border border-border-subtle bg-surface shadow-card space-y-4">
            <div className="border-b border-border-subtle pb-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-brand font-bold block">
                Section 03
              </span>
              <h2 className="text-sm font-semibold text-canvas-text flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-brand" />
                Academic & Department Affiliation
              </h2>
              <p className="text-xs text-canvas-muted mt-0.5">
                University division determining borrowing tier, hold priorities, and faculty quotas.
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

              <FormField label="Academic Department" required error={errors.department}>
                <Select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  options={[
                    { value: 'Department of Computer Science', label: 'Computer Science' },
                    { value: 'Department of Electrical Engineering', label: 'Electrical Engineering' },
                    { value: 'Department of Mathematics', label: 'Mathematics & Statistics' },
                    { value: 'School of Design & Architecture', label: 'Design & Architecture' },
                    { value: 'Department of Mechanical Engineering', label: 'Mechanical Engineering' },
                    { value: 'Faculty of Humanities & Literature', label: 'Humanities & Literature' },
                  ]}
                  hasError={!!errors.department}
                />
              </FormField>

              <FormField label="Degree Program / Job Title" required error={errors.program}>
                <Input
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                  placeholder="e.g. B.Tech Computer Science"
                  hasError={!!errors.program}
                />
              </FormField>

              <FormField label="Cohort Standing / Year">
                <Select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  options={[
                    { value: 'Year 1', label: 'Year 1 (Freshman)' },
                    { value: 'Year 2', label: 'Year 2 (Sophomore)' },
                    { value: 'Year 3', label: 'Year 3 (Junior)' },
                    { value: 'Year 4', label: 'Year 4 (Senior)' },
                    { value: 'Graduate / PhD', label: 'Graduate Researcher / PhD' },
                    { value: 'Tenured / Faculty', label: 'Tenured / Academic Faculty' },
                  ]}
                />
              </FormField>
            </div>
          </div>

          {/* SECTION 4: Membership Access & Terms */}
          <div className="p-6 rounded-2xl border border-border-subtle bg-surface shadow-card space-y-4">
            <div className="border-b border-border-subtle pb-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-brand font-bold block">
                Section 04
              </span>
              <h2 className="text-sm font-semibold text-canvas-text flex items-center gap-2">
                <Shield className="w-4 h-4 text-brand" />
                Membership Credentials & Window
              </h2>
              <p className="text-xs text-canvas-muted mt-0.5">
                Automatically generated patron accession barcode and validity dates.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Generated Member ID" description="System assigned (Read-only)">
                <Input value={generatedMemberId} disabled className="font-mono bg-canvas-subtle font-bold text-brand" />
              </FormField>

              <FormField label="Membership Start Date" required error={errors.membershipStartDate}>
                <Input
                  type="date"
                  value={membershipStartDate}
                  onChange={(e) => setMembershipStartDate(e.target.value)}
                  hasError={!!errors.membershipStartDate}
                />
              </FormField>

              <FormField label="Term Expiry Date" required error={errors.membershipExpiryDate}>
                <Input
                  type="date"
                  value={membershipExpiryDate}
                  onChange={(e) => setMembershipExpiryDate(e.target.value)}
                  hasError={!!errors.membershipExpiryDate}
                />
              </FormField>
            </div>
          </div>
        </form>

        {/* Right: Live Patron Smartcard Preview (5 cols) */}
        <div className="lg:col-span-5 sticky top-24 space-y-4">
          <div className="flex items-center justify-between text-xs text-canvas-muted px-1">
            <span className="font-mono uppercase tracking-wider font-semibold text-brand flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Live Patron Card Preview
            </span>
            <span className="font-mono text-[10px]">Smartcard RFID</span>
          </div>

          {/* University Library Smartcard Design */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-surface to-canvas-subtle border-2 border-border-strong shadow-elevated relative overflow-hidden space-y-5">
            {/* Header chip & brand */}
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

            {/* Avatar & Name */}
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
                  {academicYear} • {program || 'General Academic'}
                </span>
              </div>
            </div>

            {/* Smartcard Barcode & Metadata Strip */}
            <div className="pt-3 border-t border-border-subtle/80 space-y-3">
              <div className="flex items-center justify-between font-mono text-xs">
                <div>
                  <span className="text-[9px] uppercase text-canvas-muted block">Patron ID</span>
                  <span className="font-bold text-canvas-text text-sm tracking-wider">{generatedMemberId}</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase text-canvas-muted block">Expires</span>
                  <span className="font-bold text-canvas-text">{membershipExpiryDate}</span>
                </div>
              </div>

              {/* Barcode Graphic Simulation */}
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
                  *{generatedMemberId}*
                </span>
              </div>
            </div>
          </div>

          {/* Borrowing Privileges Notice */}
          <div className="p-4 rounded-xl border border-border-subtle bg-surface text-xs text-canvas-muted space-y-1.5 shadow-ambient">
            <h4 className="font-semibold text-canvas-text flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-brand" />
              Standard Institutional Allowance
            </h4>
            <p className="leading-relaxed text-[11px]">
              Upon registration, this patron will receive borrowing access up to 5 concurrent physical volumes with a 14-day circulation window and 2 allowable extensions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
