import { LegislationImpact, LicenseLegislationSource } from '@prisma/client';
import { Legislation } from './legislation.entity';

/** One entry of a license's radar: a legislation plus what the license says about it. */
export interface LicenseLegislation {
  id: string;
  licenseId: string;
  legislationId: string;
  source: LicenseLegislationSource;
  citedExcerpt: string | null;
  impact: LegislationImpact | null;
  technicalAnalysis: string | null;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  legislation: Legislation;
}
