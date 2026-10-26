/*
 * The extraction provider could not be used: missing or rejected credentials,
 * throttling, or an outage. The reason is for logs only — it is never sent to
 * the client.
 */
export class LicenseExtractionUnavailableError extends Error {
  constructor(reason: string) {
    super(`License extraction is unavailable: ${reason}`);
    this.name = 'LicenseExtractionUnavailableError';
  }
}
