import { LicenseConditionRiskLevel } from './license-condition-risk-level';
import { calculateLicenseConditionRiskLevel } from './license-condition-risk.calculator';

describe('calculateLicenseConditionRiskLevel', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');

  it.each([
    [45, LicenseConditionRiskLevel.REGULAR],
    [15, LicenseConditionRiskLevel.ATTENTION],
    [3, LicenseConditionRiskLevel.RISK],
    [-1, LicenseConditionRiskLevel.RISK],
  ])('classifies a condition due in %i days as %s', (days, expected) => {
    const dueDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    expect(calculateLicenseConditionRiskLevel(dueDate, now)).toBe(expected);
  });
});
