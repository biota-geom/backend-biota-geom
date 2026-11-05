import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { LicenseExtractionJobNotFoundError } from '../../domain/errors/license-extraction-job-not-found.error';
import { LICENSES_MESSAGES } from '../messages/licenses.messages.pt-br';
import { LicenseExtractionExceptionFilter } from './license-extraction-exception.filter';

describe('LicenseExtractionExceptionFilter', () => {
  it('maps a missing job to 404 without echoing the job id', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;

    new LicenseExtractionExceptionFilter().catch(
      new LicenseExtractionJobNotFoundError('secret-job-id'),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: LICENSES_MESSAGES.EXTRACTION_JOB_NOT_FOUND,
      }),
    );
    expect(JSON.stringify(json.mock.calls[0])).not.toContain('secret-job-id');
  });
});
