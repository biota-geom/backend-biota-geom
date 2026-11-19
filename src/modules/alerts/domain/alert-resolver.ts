/*
 * Marks pending (OPEN/READ) alerts as RESOLVED once the underlying obligation
 * no longer exists. `TTransaction` is the caller's ongoing database
 * transaction, so the resolution commits or rolls back with the change that
 * made the alert obsolete.
 */
export abstract class AlertResolver<TTransaction = unknown> {
  /** Resolves the license alerts and the alerts of its conditions. */
  abstract resolveForLicense(
    licenseId: string,
    transaction?: TTransaction,
  ): Promise<number>;

  abstract resolveForConditions(
    conditionIds: string[],
    transaction?: TTransaction,
  ): Promise<number>;
}
