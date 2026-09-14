import { parseDurationToSeconds } from './duration';

describe('parseDurationToSeconds', () => {
  it.each([
    ['30s', 30],
    ['15m', 900],
    ['2h', 7200],
    ['7d', 604800],
  ])('converts "%s" to %i seconds', (duration, expected) => {
    expect(parseDurationToSeconds(duration)).toBe(expected);
  });

  it('throws on an invalid duration format', () => {
    expect(() => parseDurationToSeconds('invalid')).toThrow(
      'Invalid duration format: "invalid"',
    );
  });

  it('throws when the unit is missing', () => {
    expect(() => parseDurationToSeconds('15')).toThrow();
  });
});
