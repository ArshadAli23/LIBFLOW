/**
 * LIBFLOW — LibrarySettings Model (Tenant Policy Parameters)
 */

export interface LibrarySettingsEntity {
  id: string;
  tenantId: string;
  libraryName: string;
  logoUrl?: string | null;
  primaryColor: string;
  secondaryColor: string;
  contactEmail: string;
  phone: string;
  address: string;
  website: string;
  maxBooksPerMember: number;
  defaultBorrowDurationDays: number;
  maxRenewalLimit: number;
  finePerDay: number;
  gracePeriodDays: number;
  maxFineCap: number;
  reservationExpiryHours: number;
  currencySymbol: string;
  operatingHours: string;
  createdAt: Date;
  updatedAt: Date;
}

export const mapLibrarySettingsRow = (row: Record<string, any>): LibrarySettingsEntity => {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id || 'default-library'),
    libraryName: String(row.library_name || 'Central University Library'),
    logoUrl: row.logo_url ? String(row.logo_url) : null,
    primaryColor: String(row.primary_color || '#18181B'),
    secondaryColor: String(row.secondary_color || '#71717A'),
    contactEmail: String(row.contact_email || 'library@university.edu'),
    phone: String(row.phone || '+1 (555) 234-5678'),
    address: String(row.address || '100 University Ave, Campus Center'),
    website: String(row.website || 'https://library.university.edu'),
    maxBooksPerMember: Number(row.max_books_per_member || 5),
    defaultBorrowDurationDays: Number(row.default_borrow_duration_days || 14),
    maxRenewalLimit: Number(row.max_renewal_limit || 2),
    finePerDay: Number(row.fine_per_day || 5),
    gracePeriodDays: Number(row.grace_period_days || 2),
    maxFineCap: Number(row.max_fine_cap || 100),
    reservationExpiryHours: Number(row.reservation_expiry_hours || 48),
    currencySymbol: String(row.currency_symbol || '$'),
    operatingHours: String(row.operating_hours || 'Mon-Fri: 8am-10pm, Sat-Sun: 10am-6pm'),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
};
