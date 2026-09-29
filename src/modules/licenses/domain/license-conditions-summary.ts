import { LicenseConditionStatus } from '@prisma/client';
import { License } from './license.entity';

export interface LicenseConditionsSummary {
  total: number;
  attended: number;
}

export interface LicenseWithConditionsSummary extends License {
  conditionsSummary: LicenseConditionsSummary;
}

/*
 * Statuses that count a condition as fulfilled. LicenseConditionStatus only
 * models deadline risk today (REGULAR/ATTENTION/RISK) — none of those means
 * the obligation was met, so no condition counts as attended yet. Once a
 * fulfillment status exists, list it here: the listing query reads from this
 * array and nothing else needs to change.
 */
export const ATTENDED_LICENSE_CONDITION_STATUSES: readonly LicenseConditionStatus[] =
  [];
