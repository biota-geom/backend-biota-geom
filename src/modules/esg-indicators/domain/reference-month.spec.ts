import { InvalidReferenceMonthError } from './errors/invalid-reference-month.error';
import {
  formatReferenceMonth,
  parseReferenceMonth,
  previousReferenceMonth,
} from './reference-month';

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

describe('previousReferenceMonth', () => {
  it('returns the first day of the month before', () => {
    expect(
      previousReferenceMonth(
        new Date('2026-09-01T00:00:00.000Z'),
      ).toISOString(),
    ).toBe('2026-08-01T00:00:00.000Z');
  });

  it('rolls January back to December of the year before', () => {
    expect(
      previousReferenceMonth(
        new Date('2026-01-01T00:00:00.000Z'),
      ).toISOString(),
    ).toBe('2025-12-01T00:00:00.000Z');
  });
});

describe('formatReferenceMonth', () => {
  it('formats the stored date as YYYY-MM', () => {
    expect(formatReferenceMonth(new Date('2026-09-01T00:00:00.000Z'))).toBe(
      '2026-09',
    );
  });
});
