import { Injectable } from '@nestjs/common';
import { LicenseExtractionJobNotFoundError } from '../domain/errors/license-extraction-job-not-found.error';
import { ExtractionJob, ExtractionJobStore } from '../domain/extraction-job';

@Injectable()
export class GetLicenseExtractionJobUseCase {
  constructor(private readonly jobs: ExtractionJobStore) {}

  async execute(jobId: string, userId: string): Promise<ExtractionJob> {
    const job = await this.jobs.get(jobId, userId);
    if (!job) throw new LicenseExtractionJobNotFoundError(jobId);

    return job;
  }
}
