import { Injectable, Logger } from '@nestjs/common';
import { LicenseExtractionTimeoutError } from '../domain/errors/license-extraction-timeout.error';
import { LicenseExtractionUnavailableError } from '../domain/errors/license-extraction-unavailable.error';
import { UnreadableLicenseDocumentError } from '../domain/errors/unreadable-license-document.error';
import {
  ExtractionFailureReason,
  ExtractionJobStore,
} from '../domain/extraction-job';
import { ExtractLicenseDataUseCase } from './extract-license-data.use-case';

/*
 * Registers an extraction job and runs the model in the background, so the
 * HTTP request that uploaded the PDF returns immediately instead of staying
 * open for the whole model call.
 */
@Injectable()
export class StartLicenseExtractionUseCase {
  private readonly logger = new Logger(StartLicenseExtractionUseCase.name);

  constructor(
    private readonly extractLicenseData: ExtractLicenseDataUseCase,
    private readonly jobs: ExtractionJobStore,
  ) {}

  async execute(document: Buffer, userId: string): Promise<string> {
    const jobId = await this.jobs.create(userId);
    void this.run(jobId, document);

    return jobId;
  }

  private async run(jobId: string, document: Buffer): Promise<void> {
    try {
      const extraction = await this.extractLicenseData.execute(document);
      await this.jobs.save(jobId, { status: 'DONE', extraction });
    } catch (error) {
      const reason = toFailureReason(error);
      if (!reason) this.logger.error(`Extraction job ${jobId} crashed`, error);
      await this.jobs.save(jobId, {
        status: 'FAILED',
        reason: reason ?? 'UNAVAILABLE',
      });
    }
  }
}

function toFailureReason(error: unknown): ExtractionFailureReason | null {
  if (error instanceof UnreadableLicenseDocumentError) return 'UNREADABLE';
  if (error instanceof LicenseExtractionTimeoutError) return 'TIMEOUT';
  if (error instanceof LicenseExtractionUnavailableError) return 'UNAVAILABLE';

  return null;
}
