import { LicenseStatus, LicenseType } from '@prisma/client';
import { AUTH_MESSAGES } from '../../auth/presentation/messages/auth.messages.pt-br';
import { CreateLicenseUseCase } from '../application/create-license.use-case';
import { ListLicensesByCustomerUseCase } from '../application/list-licenses-by-customer.use-case';
import {
  fileValidationExceptionFactory,
  invalidCustomerIdException,
  LicensesController,
} from './licenses.controller';
import { LICENSES_MESSAGES } from './messages/licenses.messages.pt-br';

function buildController(overrides?: {
  createLicenseUseCase?: unknown;
  listLicensesByCustomerUseCase?: unknown;
}): LicensesController {
  return new LicensesController(
    (overrides?.createLicenseUseCase ??
      ({ execute: jest.fn() } as unknown)) as CreateLicenseUseCase,
    (overrides?.listLicensesByCustomerUseCase ??
      ({ execute: jest.fn() } as unknown)) as ListLicensesByCustomerUseCase,
  );
}

describe('invalidCustomerIdException', () => {
  it('answers 400 with the generic invalid-request message', () => {
    const exception = invalidCustomerIdException();

    expect(exception.getStatus()).toBe(400);
    expect(exception.message).toBe(AUTH_MESSAGES.INVALID_REQUEST);
  });
});

describe('fileValidationExceptionFactory', () => {
  it.each([
    LICENSES_MESSAGES.FILE_TOO_LARGE,
    LICENSES_MESSAGES.INVALID_FILE_TYPE,
  ])('passes our own message "%s" through as a 422', (message) => {
    const exception = fileValidationExceptionFactory(message);

    expect(exception.getStatus()).toBe(422);
    expect(exception.message).toBe(message);
  });

  it("replaces Nest's English default with the PT-BR file-required message", () => {
    const exception = fileValidationExceptionFactory('File is required');

    expect(exception.getStatus()).toBe(422);
    expect(exception.message).toBe(LICENSES_MESSAGES.FILE_REQUIRED);
  });
});

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
    const controller = buildController({ createLicenseUseCase: { execute } });

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

  describe('listLicenses', () => {
    it('forwards the customer and authenticated user to the use case and maps the panel response', async () => {
      const execute = jest.fn().mockResolvedValue({
        summary: { total: 2, regular: 1, attention: 0, expired: 1 },
        licenses: [
          {
            id: 'license-1',
            customerId: 'customer-1',
            type: LicenseType.LP,
            processNumber: 'LP nº 482/2024',
            issuingAgencyId: 'agency-1',
            issuingAgency: {
              id: 'agency-1',
              name: 'FEPAM',
              acronym: 'FEPAM',
              createdAt: new Date(),
            },
            issueDate: new Date('2024-03-12T00:00:00.000Z'),
            expirationDate: new Date('2026-03-12T00:00:00.000Z'),
            status: LicenseStatus.REGULAR,
            documentUrl: 'https://bucket.aws.com/licenses/lp-482-2024.pdf',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'license-2',
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
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });
      const controller = buildController({
        listLicensesByCustomerUseCase: { execute },
      });

      const response = await controller.listLicenses('customer-1', {
        id: 'owner-1',
      });

      expect(execute).toHaveBeenCalledWith('customer-1', 'owner-1');
      expect(response).toEqual({
        summary: { total: 2, regular: 1, attention: 0, expired: 1 },
        licenses: [
          expect.objectContaining({
            id: 'license-1',
            type: 'Licença Prévia (LP)',
            process_number: 'LP nº 482/2024',
            issuing_agency: 'FEPAM',
            status: 'Regular',
          }),
          expect.objectContaining({
            id: 'license-2',
            type: 'Licença de Operação (LO)',
            process_number: 'LO nº 118/2020',
            issuing_agency: 'FEPAM',
            status: 'Vencida',
          }),
        ],
      });
    });
  });
});
