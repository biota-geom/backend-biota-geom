import { calculateConformityPercentage } from './conformity-percentage';

describe('calculateConformityPercentage', () => {
  it.each([
    [7, 10, 70],
    [10, 10, 100],
    [0, 10, 0],
    [1, 3, 33],
  ])(
    '%i regular licenses out of %i total licenses return %i%%',
    (regularLicenses, totalLicenses, expected) => {
      expect(
        calculateConformityPercentage(regularLicenses, totalLicenses),
      ).toBe(expected);
    },
  );

  it('returns null when the customer has no licenses', () => {
    expect(calculateConformityPercentage(0, 0)).toBeNull();
  });
});
