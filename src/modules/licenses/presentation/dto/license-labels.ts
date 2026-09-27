import { LicenseStatus, LicenseType } from '@prisma/client';

// PT-BR display labels the API contract requires verbatim. Kept here, at the
// presentation boundary — the domain/infra layers only ever see the English
// LicenseStatus/LicenseType enums (see license-status.calculator.ts).
export const STATUS_LABELS: Record<LicenseStatus, string> = {
  [LicenseStatus.REGULAR]: 'Regular',
  [LicenseStatus.ATTENTION]: 'Atenção',
  [LicenseStatus.EXPIRED]: 'Vencida',
};

export const LICENSE_TYPE_LABELS: Record<LicenseType, string> = {
  [LicenseType.LP]: 'Licença Prévia (LP)',
  [LicenseType.LI]: 'Licença de Instalação (LI)',
  [LicenseType.LO]: 'Licença de Operação (LO)',
};
