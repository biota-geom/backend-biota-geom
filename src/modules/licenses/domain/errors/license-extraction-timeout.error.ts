export class LicenseExtractionTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`License extraction did not finish within ${timeoutMs}ms`);
    this.name = 'LicenseExtractionTimeoutError';
  }
}
