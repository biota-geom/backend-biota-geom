import { InvalidReferenceMonthError } from './errors/invalid-reference-month.error';
import { parseReferenceMonth } from './reference-month';

describe('parseReferenceMonth', () => {
  it('returns the first day of the month at UTC midnight', () => {
    expect(parseReferenceMonth('2026-09').toISOString()).toBe(
      '2026-09-01T00:00:00.000Z',
    );
    expect(parseReferenceMonth('2026-12').toISOString()).toBe(
      '2026-12-01T00:00:00.000Z',
    );
  });

  it.each([
    '2026-9',
    '2026-13',
    '2026-00',
    '26-09',
    '2026/09',
    '2026-09-01',
    '',
  ])('rejects "%s"', (month) => {
    expect(() => parseReferenceMonth(month)).toThrow(
      InvalidReferenceMonthError,
    );
  });
});
