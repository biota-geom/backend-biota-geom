export class LicenseExtractionJobNotFoundError extends Error {
  constructor(jobId: string) {
    super(`Extraction job "${jobId}" does not exist`);
    this.name = 'LicenseExtractionJobNotFoundError';
  }
}
