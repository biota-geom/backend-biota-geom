import {
  LegislationImpact,
  LegislationType,
  LicenseLegislationSource,
} from '@prisma/client';

export interface LegislationIdentity {
  type: LegislationType;
  number: string;
  year: number;
}

export interface CreateLegislationData extends LegislationIdentity {
  issuingBody: string;
  summary?: string | null;
}

export interface CreateLicenseLegislationData {
  licenseId: string;
  legislationId: string;
  source: LicenseLegislationSource;
  citedExcerpt?: string | null;
  impact?: LegislationImpact | null;
  technicalAnalysis?: string | null;
}

export interface UpdateLicenseLegislationData {
  citedExcerpt?: string | null;
  impact?: LegislationImpact | null;
  technicalAnalysis?: string | null;
  readAt?: Date | null;
}
