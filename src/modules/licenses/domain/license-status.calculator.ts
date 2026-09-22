import { LicenseStatus } from '@prisma/client';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ATTENTION_THRESHOLD_DAYS = 30;

/*
 * Server-side status derivation (never trust a client-supplied status):
 *   - expirationDate in the past                -> EXPIRED  ("Vencida")
 *   - expirationDate within ATTENTION_THRESHOLD  -> ATTENTION ("Atenção")
 *   - expirationDate further out                 -> REGULAR  ("Regular")
 * `now` defaults to the real clock but is injectable so callers (and tests)
 * can pin "today" instead of depending on wall-clock time.
 */
export function calculateLicenseStatus(
  expirationDate: Date,
  now: Date = new Date(),
): LicenseStatus {
  const daysUntilExpiration = Math.ceil(
    (expirationDate.getTime() - now.getTime()) / MS_PER_DAY,
  );

  if (daysUntilExpiration < 0) {
    return LicenseStatus.EXPIRED;
  }

  if (daysUntilExpiration <= ATTENTION_THRESHOLD_DAYS) {
    return LicenseStatus.ATTENTION;
  }

  return LicenseStatus.REGULAR;
}
