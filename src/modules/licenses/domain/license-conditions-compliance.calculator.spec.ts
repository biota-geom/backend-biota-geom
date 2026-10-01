import { calculateLicenseConditionsCompliance } from './license-conditions-compliance.calculator';

const NOW = new Date('2026-09-29T12:00:00.000Z');
const DAY_IN_MS = 24 * 60 * 60 * 1000;

function daysFromNow(days: number): Date {
  return new Date(NOW.getTime() + days * DAY_IN_MS);
}

describe('calculateLicenseConditionsCompliance', () => {
  it('counts only REGULAR conditions as compliant (4 regular, 2 attention, 2 risk)', () => {
    const dueDates = [
      ...Array.from({ length: 4 }, () => daysFromNow(60)),
      ...Array.from({ length: 2 }, () => daysFromNow(15)),
      ...Array.from({ length: 2 }, () => daysFromNow(-1)),
    ];

    expect(calculateLicenseConditionsCompliance(dueDates, NOW)).toEqual({
      totalActive: 8,
      inCompliance: 4,
      compliancePercentage: 50,
    });
  });

  it('returns 100 when every condition is regular', () => {
    expect(
      calculateLicenseConditionsCompliance(
        [daysFromNow(31), daysFromNow(90)],
        NOW,
      ),
    ).toEqual({ totalActive: 2, inCompliance: 2, compliancePercentage: 100 });
  });

  it('treats a condition due in exactly 30 days as attention, not regular', () => {
    expect(
      calculateLicenseConditionsCompliance([daysFromNow(30)], NOW),
    ).toEqual({ totalActive: 1, inCompliance: 0, compliancePercentage: 0 });
  });

  it('rounds the percentage to the nearest integer', () => {
    expect(
      calculateLicenseConditionsCompliance(
        [daysFromNow(60), daysFromNow(3), daysFromNow(3)],
        NOW,
      ).compliancePercentage,
    ).toBe(33);
    expect(
      calculateLicenseConditionsCompliance(
        [daysFromNow(60), daysFromNow(60), daysFromNow(3)],
        NOW,
      ).compliancePercentage,
    ).toBe(67);
  });

  it('returns 100 without dividing by zero when there are no active conditions', () => {
    expect(calculateLicenseConditionsCompliance([], NOW)).toEqual({
      totalActive: 0,
      inCompliance: 0,
      compliancePercentage: 100,
    });
  });
});
