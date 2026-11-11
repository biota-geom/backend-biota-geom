import { GetLicenseExtractionJobUseCase } from '../application/get-license-extraction-job.use-case';
import { StartLicenseExtractionUseCase } from '../application/start-license-extraction.use-case';
import { ExtractionJob } from '../domain/extraction-job';
import { LicenseExtractionController } from './license-extraction.controller';
import { LICENSES_MESSAGES } from './messages/licenses.messages.pt-br';

const USER = { id: 'user-1' };

function build(job?: ExtractionJob) {
  const start = jest.fn().mockResolvedValue('job-1');
  const get = jest.fn().mockResolvedValue(job);
  const controller = new LicenseExtractionController(
    { execute: start } as unknown as StartLicenseExtractionUseCase,
    { execute: get } as unknown as GetLicenseExtractionJobUseCase,
  );

  return { controller, start, get };
}

describe('LicenseExtractionController', () => {
  it('starts the extraction for the caller and answers with the job id', async () => {
    const { controller, start } = build();
    const buffer = Buffer.from('%PDF-1.7');

    await expect(controller.extract({ buffer }, USER)).resolves.toEqual({
      job_id: 'job-1',
    });
    expect(start).toHaveBeenCalledWith(buffer, USER.id);
  });

  it('answers a pending job without result or error', async () => {
    const { controller, get } = build({ status: 'PENDING' });

    await expect(controller.getExtraction('job-1', USER)).resolves.toEqual({
      status: 'PENDING',
      result: null,
      error: null,
    });
    expect(get).toHaveBeenCalledWith('job-1', USER.id);
  });

  it('answers a finished job with the snake_case contract', async () => {
    const { controller } = build({
      status: 'DONE',
      extraction: {
        extractedData: {
          type: 'LO',
          processNumber: 'LO nº 118/2020',
          issuingAgency: 'FEPAM',
          issueDate: '2020-01-10',
          expirationDate: '2025-01-10',
        },
        suggestedConditions: [
          {
            environmentalDescriptor: 'Resíduos Sólidos',
            description: 'Apresentar relatório semestral',
            conditionType: 'PERIODIC',
            periodicity: 'SEMIANNUAL',
            dueDate: '2025-07-10',
          },
        ],
      },
    });

    await expect(controller.getExtraction('job-1', USER)).resolves.toEqual({
      status: 'DONE',
      error: null,
      result: {
        extracted_data: {
          type: 'LO',
          process_number: 'LO nº 118/2020',
          issuing_agency: 'FEPAM',
          issue_date: '2020-01-10',
          expiration_date: '2025-01-10',
        },
        suggested_conditions: [
          {
            environmental_descriptor: 'Resíduos Sólidos',
            description: 'Apresentar relatório semestral',
            condition_type: 'PERIODIC',
            periodicity: 'SEMIANNUAL',
            due_date: '2025-07-10',
          },
        ],
      },
    });
  });

  it.each([
    ['UNREADABLE', LICENSES_MESSAGES.EXTRACTION_UNREADABLE],
    ['UNAVAILABLE', LICENSES_MESSAGES.EXTRACTION_UNAVAILABLE],
    ['TIMEOUT', LICENSES_MESSAGES.EXTRACTION_TIMEOUT],
  ] as const)(
    'answers a %s failure with its PT-BR message',
    async (reason, error) => {
      const { controller } = build({ status: 'FAILED', reason });

      await expect(controller.getExtraction('job-1', USER)).resolves.toEqual({
        status: 'FAILED',
        result: null,
        error,
      });
    },
  );
});
