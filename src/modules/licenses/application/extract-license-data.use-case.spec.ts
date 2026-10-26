import { UnreadableLicenseDocumentError } from '../domain/errors/unreadable-license-document.error';
import { LicenseExtraction } from '../domain/license-extraction';
import { ExtractLicenseDataUseCase } from './extract-license-data.use-case';

const PDF = Buffer.from('%PDF-1.7\nlicense');

const EMPTY_DATA = {
  type: null,
  processNumber: null,
  issuingAgency: null,
  issueDate: null,
  expirationDate: null,
};

describe('ExtractLicenseDataUseCase', () => {
  function build(result: LicenseExtraction) {
    const extract = jest.fn().mockResolvedValue(result);
    const useCase = new ExtractLicenseDataUseCase({ extract });

    return { useCase, extract };
  }

  it('returns the suggestions read from the PDF', async () => {
    const extraction: LicenseExtraction = {
      extractedData: { ...EMPTY_DATA, type: 'LO', issuingAgency: 'FEPAM' },
      suggestedConditions: [],
    };
    const { useCase, extract } = build(extraction);

    await expect(useCase.execute(PDF)).resolves.toBe(extraction);
    expect(extract).toHaveBeenCalledWith(PDF);
  });

  it('accepts a document with conditions only', async () => {
    const extraction: LicenseExtraction = {
      extractedData: EMPTY_DATA,
      suggestedConditions: [
        {
          environmentalDescriptor: null,
          description: 'Apresentar relatório.',
          conditionType: null,
          periodicity: null,
          dueDate: null,
        },
      ],
    };
    const { useCase } = build(extraction);

    await expect(useCase.execute(PDF)).resolves.toBe(extraction);
  });

  it('rejects a file without the PDF signature before calling the model', async () => {
    const { useCase, extract } = build({
      extractedData: EMPTY_DATA,
      suggestedConditions: [],
    });

    await expect(
      useCase.execute(Buffer.from('GIF89a not a pdf')),
    ).rejects.toThrow(UnreadableLicenseDocumentError);
    expect(extract).not.toHaveBeenCalled();
  });

  it('rejects a document from which nothing could be identified', async () => {
    const { useCase } = build({
      extractedData: EMPTY_DATA,
      suggestedConditions: [],
    });

    await expect(useCase.execute(PDF)).rejects.toThrow(
      UnreadableLicenseDocumentError,
    );
  });
});
