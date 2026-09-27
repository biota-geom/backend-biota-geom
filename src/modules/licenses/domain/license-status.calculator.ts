import { LicenseStatus } from '@prisma/client';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/*
 * Fixed lookahead window used to classify a license as "Atenção" as it
 * approaches its expiration date. Global domain constant on purpose — the
 * MVP has no settings screen to make this configurable per customer.
 */
export const LICENSE_ATTENTION_WINDOW_DAYS = 30;

/*
 * Server-side status derivation (never trust a client-supplied status):
 *   - expirationDate in the past                     -> EXPIRED  ("Vencida")
 *   - expirationDate within LICENSE_ATTENTION_WINDOW  -> ATTENTION ("Atenção")
 *   - expirationDate further out                      -> REGULAR  ("Regular")
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

  if (daysUntilExpiration <= LICENSE_ATTENTION_WINDOW_DAYS) {
    return LicenseStatus.ATTENTION;
  }

  return LicenseStatus.REGULAR;
}
