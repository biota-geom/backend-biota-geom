import { Logger } from '@nestjs/common';
import { LicenseExtractionTimeoutError } from '../domain/errors/license-extraction-timeout.error';
import { LicenseExtractionUnavailableError } from '../domain/errors/license-extraction-unavailable.error';
import { UnreadableLicenseDocumentError } from '../domain/errors/unreadable-license-document.error';
import { LicenseExtraction } from '../domain/license-extraction';
import { StartLicenseExtractionUseCase } from './start-license-extraction.use-case';

const PDF = Buffer.from('%PDF-1.7');
const EXTRACTION: LicenseExtraction = {
  extractedData: {
    type: 'LO',
    processNumber: null,
    issuingAgency: null,
    issueDate: null,
    expirationDate: null,
  },
  suggestedConditions: [],
};

function build(extraction: jest.Mock) {
  const create = jest.fn().mockResolvedValue('job-1');
  const saved = new Promise<unknown>((resolve) => {
    save.mockImplementation((_id: string, job: unknown) => {
      resolve(job);
      return Promise.resolve();
    });
  });
  const useCase = new StartLicenseExtractionUseCase(
    { execute: extraction } as never,
    { create, save } as never,
  );

  return { useCase, create, saved };
}
const save = jest.fn();

describe('StartLicenseExtractionUseCase', () => {
  beforeEach(() => save.mockReset());

  it('returns the job id without waiting for the model', async () => {
    const extraction = jest.fn().mockReturnValue(new Promise(() => undefined));
    const { useCase, create } = build(extraction);

    await expect(useCase.execute(PDF, 'user-1')).resolves.toBe('job-1');
    expect(create).toHaveBeenCalledWith('user-1');
    expect(extraction).toHaveBeenCalledWith(PDF);
    expect(save).not.toHaveBeenCalled();
  });

  it('saves the extraction as DONE', async () => {
    const { useCase, saved } = build(jest.fn().mockResolvedValue(EXTRACTION));

    await useCase.execute(PDF, 'user-1');

    await expect(saved).resolves.toEqual({
      status: 'DONE',
      extraction: EXTRACTION,
    });
    expect(save).toHaveBeenCalledWith('job-1', expect.anything());
  });

  it.each([
    [new UnreadableLicenseDocumentError('x'), 'UNREADABLE'],
    [new LicenseExtractionTimeoutError(1), 'TIMEOUT'],
    [new LicenseExtractionUnavailableError('x'), 'UNAVAILABLE'],
    [new Error('boom'), 'UNAVAILABLE'],
  ])('saves %p as FAILED/%s', async (error, reason) => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const { useCase, saved } = build(jest.fn().mockRejectedValue(error));

    await useCase.execute(PDF, 'user-1');

    await expect(saved).resolves.toEqual({ status: 'FAILED', reason });
  });
});
