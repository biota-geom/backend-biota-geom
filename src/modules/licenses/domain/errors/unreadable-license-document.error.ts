/*
 * The document was received but no license data could be read from it: not a
 * PDF, a corrupted or unsupported PDF, a document that is not a license, or a
 * model answer that failed validation.
 */
export class UnreadableLicenseDocumentError extends Error {
  constructor(reason: string) {
    super(`License document could not be read: ${reason}`);
    this.name = 'UnreadableLicenseDocumentError';
  }
}
