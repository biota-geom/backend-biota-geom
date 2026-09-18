import { LicenseStatus, LicenseType } from '@prisma/client';
import { CreateLicenseUseCase } from '../application/create-license.use-case';
import { LicensesController } from './licenses.controller';

describe('LicensesController', () => {
  function buildFile(): Express.Multer.File {
    return {
      buffer: Buffer.from('%PDF-1.4'),
      originalname: 'licenca.pdf',
      mimetype: 'application/pdf',
    } as Express.Multer.File;
  }

  it('forwards the parsed dto, file and authenticated user to the use case', async () => {
    const execute = jest.fn().mockResolvedValue({
      id: 'license-1',
      customerId: 'customer-1',
      type: LicenseType.LO,
      processNumber: 'LO nº 118/2020',
      issuingAgencyId: 'agency-1',
      issuingAgency: {
        id: 'agency-1',
        name: 'FEPAM',
        acronym: 'FEPAM',
        createdAt: new Date(),
      },
      issueDate: new Date('2020-01-10T00:00:00.000Z'),
      expirationDate: new Date('2025-01-10T00:00:00.000Z'),
      status: LicenseStatus.EXPIRED,
      documentUrl: 'https://bucket.aws.com/licenses/lo-118-2020.pdf',
      createdAt: new Date('2020-01-10T00:00:00.000Z'),
      updatedAt: new Date('2020-01-10T00:00:00.000Z'),
    });
    const controller = new LicensesController({
      execute,
    } as unknown as CreateLicenseUseCase);

    const response = await controller.createLicense(
      'customer-1',
      {
        type: LicenseType.LO,
        process_number: 'LO nº 118/2020',
        issuing_agency_id: 'agency-1',
        issue_date: '2020-01-10T00:00:00.000Z',
        expiration_date: '2025-01-10T00:00:00.000Z',
      },
      buildFile(),
      { id: 'owner-1' },
    );

    expect(execute).toHaveBeenCalledWith({
      customerId: 'customer-1',
      ownerUserId: 'owner-1',
      type: LicenseType.LO,
      processNumber: 'LO nº 118/2020',
      issuingAgencyId: 'agency-1',
      issueDate: new Date('2020-01-10T00:00:00.000Z'),
      expirationDate: new Date('2025-01-10T00:00:00.000Z'),
      file: {
        buffer: Buffer.from('%PDF-1.4'),
        originalName: 'licenca.pdf',
        mimeType: 'application/pdf',
      },
    });
    expect(response).toEqual(
      expect.objectContaining({ id: 'license-1', status: 'Vencida' }),
    );
  });
});
