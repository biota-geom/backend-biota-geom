import { LicenseStatus } from '@prisma/client';

// PT-BR display labels the API contract requires verbatim. Kept here, at the
// presentation boundary — the domain/infra layers only ever see the English
// LicenseStatus enum (see license-status.calculator.ts).
export const STATUS_LABELS: Record<LicenseStatus, string> = {
  [LicenseStatus.REGULAR]: 'Regular',
  [LicenseStatus.ATTENTION]: 'Atenção',
  [LicenseStatus.EXPIRED]: 'Vencida',
  [LicenseStatus.ARCHIVED]: 'Renovada/Arquivada',
};
