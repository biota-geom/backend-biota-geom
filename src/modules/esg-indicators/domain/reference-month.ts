import { InvalidReferenceMonthError } from './errors/invalid-reference-month.error';

const MONTH_PATTERN = /^((?:19|20|21)\d{2})-(0[1-9]|1[0-2])$/;

/*
 * Turns a "YYYY-MM" string into the first day of that month at UTC midnight,
 * which is how the month is stored (a DATE column). Built with Date.UTC so the
 * server time zone can never shift it to the previous day.
 */
export function parseReferenceMonth(month: string): Date {
  const match = MONTH_PATTERN.exec(month);

  if (!match) {
    throw new InvalidReferenceMonthError(month);
  }

  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
}

// The first day of the month before `referenceMonth`, also at UTC midnight.
export function previousReferenceMonth(referenceMonth: Date): Date {
  return new Date(
    Date.UTC(
      referenceMonth.getUTCFullYear(),
      referenceMonth.getUTCMonth() - 1,
      1,
    ),
  );
}

// Back from the stored date to the "YYYY-MM" the API speaks.
export function formatReferenceMonth(referenceMonth: Date): string {
  return referenceMonth.toISOString().slice(0, 7);
}
