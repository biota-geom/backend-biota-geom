import { ExtractLicenseDataUseCase } from '../application/extract-license-data.use-case';
import { LicenseExtraction } from '../domain/license-extraction';
import { LicenseExtractionController } from './license-extraction.controller';

describe('LicenseExtractionController', () => {
  it('extracts the uploaded PDF and answers with the snake_case contract', async () => {
    const extraction: LicenseExtraction = {
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
    };
    const execute = jest.fn().mockResolvedValue(extraction);
    const controller = new LicenseExtractionController({
      execute,
    } as unknown as ExtractLicenseDataUseCase);
    const buffer = Buffer.from('%PDF-1.7');

    await expect(controller.extract({ buffer })).resolves.toEqual({
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
    });
    expect(execute).toHaveBeenCalledWith(buffer);
  });
});
