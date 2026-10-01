import { calculateLicenseConditionRiskLevel } from './license-condition-risk.calculator';
import { LicenseConditionRiskLevel } from './license-condition-risk-level';

export interface LicenseConditionsCompliance {
  totalActive: number;
  inCompliance: number;
  compliancePercentage: number;
}

// A customer with no active conditions has nothing overdue, so it counts as
// fully compliant instead of dividing by zero.
export const EMPTY_CONDITIONS_COMPLIANCE_PERCENTAGE = 100;

// Canonical compliance formula (US04 card and US21 progress bar):
// REGULAR conditions / active conditions * 100. ATTENTION conditions are not
// overdue yet, but they are not REGULAR either, so they stay out of the
// numerator.
// TODO(US18): exclude conditions of renewed/archived licenses once that
// status exists; until then every condition is active.
export function calculateLicenseConditionsCompliance(
  dueDates: Date[],
  now: Date,
): LicenseConditionsCompliance {
  const totalActive = dueDates.length;
  const inCompliance = dueDates.filter(
    (dueDate) =>
      calculateLicenseConditionRiskLevel(dueDate, now) ===
      LicenseConditionRiskLevel.REGULAR,
  ).length;

  return {
    totalActive,
    inCompliance,
    compliancePercentage:
      totalActive === 0
        ? EMPTY_CONDITIONS_COMPLIANCE_PERCENTAGE
        : Math.round((inCompliance / totalActive) * 100),
  };
}
