import { LicenseConditionRiskLevel } from './license-condition-risk-level';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function calculateLicenseConditionRiskLevel(
  dueDate: Date,
  now: Date,
): LicenseConditionRiskLevel {
  const daysUntilDue = Math.ceil(
    (dueDate.getTime() - now.getTime()) / DAY_IN_MS,
  );

  if (daysUntilDue <= 7) {
    return LicenseConditionRiskLevel.RISK;
  }

  if (daysUntilDue <= 30) {
    return LicenseConditionRiskLevel.ATTENTION;
  }

  return LicenseConditionRiskLevel.REGULAR;
}
