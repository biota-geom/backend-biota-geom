import { calculateVariationPct } from './esg-indicator-variation';

describe('calculateVariationPct', () => {
  it('returns the change in percent against the previous month', () => {
    expect(calculateVariationPct(1100, 1000)).toBe(10);
  });

  it('keeps one decimal place', () => {
    expect(calculateVariationPct(53200, 50000)).toBe(6.4);
    expect(calculateVariationPct(148, 150)).toBe(-1.3);
  });

  it('rounds halves away from zero on both sides', () => {
    expect(calculateVariationPct(102.25, 100)).toBe(2.3);
    expect(calculateVariationPct(97.75, 100)).toBe(-2.3);
  });

  it('returns zero, never negative zero, for a change too small to show', () => {
    expect(Object.is(calculateVariationPct(99.99, 100), 0)).toBe(true);
    expect(calculateVariationPct(100, 100)).toBe(0);
  });

  it('returns null without a previous value or with a previous of zero', () => {
    expect(calculateVariationPct(12.3, null)).toBeNull();
    expect(calculateVariationPct(5, 0)).toBeNull();
  });

  it('returns null without a current value', () => {
    expect(calculateVariationPct(null, 100)).toBeNull();
  });
});
