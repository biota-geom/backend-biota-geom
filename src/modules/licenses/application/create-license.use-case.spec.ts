import { LicenseStatus } from '@prisma/client';
import { FileStorage } from '../../../common/storage/file-storage';
import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { InvalidLicenseDateRangeError } from '../domain/errors/invalid-license-date-range.error';
import { LicenseRepository } from '../domain/licenses.repository';
import { CreateLicenseUseCase } from './create-license.use-case';

function buildUseCase(overrides?: {
  customerRepository?: Partial<CustomerRepository>;
  licenseRepository?: Partial<LicenseRepository>;
  documentStorage?: Partial<FileStorage>;
}) {
  const customerRepository: Partial<CustomerRepository> = {
    findOne: jest.fn().mockResolvedValue({ id: 'customer-1' }),
    ...overrides?.customerRepository,
  };
  const licenseRepository: Partial<LicenseRepository> = {
    create: jest.fn().mockResolvedValue({ id: 'license-1' }),
    ...overrides?.licenseRepository,
  };
  const documentStorage: Partial<FileStorage> = {
    upload: jest
      .fn()
      .mockResolvedValue({ url: 'https://storage.example.com/license.pdf' }),
    ...overrides?.documentStorage,
  };

  const useCase = new CreateLicenseUseCase(
    licenseRepository as LicenseRepository,
    customerRepository as CustomerRepository,
    documentStorage as FileStorage,
  );

  return {
    useCase,
    customerRepository,
    licenseRepository,
    documentStorage,
  };
}

const baseInput = {
  customerId: 'customer-1',
  ownerUserId: 'owner-1',
  type: 'LO',
  processNumber: 'LO nº 118/2020',
  issuingAgency: 'FEPAM',
  issueDate: new Date('2020-01-10T00:00:00.000Z'),
  expirationDate: new Date('2099-01-10T00:00:00.000Z'),
  file: {
    buffer: Buffer.from('pdf'),
    originalName: 'licenca.pdf',
    mimeType: 'application/pdf',
  },
};

describe('CreateLicenseUseCase', () => {
  it('throws CustomerNotFoundError when the customer is missing or not owned', async () => {
    const { useCase, customerRepository } = buildUseCase({
      customerRepository: { findOne: jest.fn().mockResolvedValue(null) },
    });

    await expect(useCase.execute(baseInput)).rejects.toThrow(
      CustomerNotFoundError,
    );
    expect(customerRepository.findOne).toHaveBeenCalledWith(
      baseInput.customerId,
      baseInput.ownerUserId,
    );
  });

  it('throws InvalidLicenseDateRangeError when expirationDate is not after issueDate', async () => {
    const { useCase } = buildUseCase();

    await expect(
      useCase.execute({
        ...baseInput,
        expirationDate: baseInput.issueDate,
      }),
    ).rejects.toThrow(InvalidLicenseDateRangeError);
  });

  it('never uploads the file when a prior validation fails', async () => {
    const { useCase, documentStorage } = buildUseCase({
      customerRepository: { findOne: jest.fn().mockResolvedValue(null) },
    });

    await expect(useCase.execute(baseInput)).rejects.toThrow();
    expect(documentStorage.upload).not.toHaveBeenCalled();
  });

  it('uploads the document, computes the status and persists the license', async () => {
    const { useCase, licenseRepository, documentStorage } = buildUseCase();

    const result = await useCase.execute(baseInput);

    expect(documentStorage.upload).toHaveBeenCalledWith(baseInput.file, {
      category: 'licenses',
      customerId: baseInput.customerId,
    });
    expect(licenseRepository.create).toHaveBeenCalledWith({
      customerId: baseInput.customerId,
      type: baseInput.type,
      processNumber: baseInput.processNumber,
      issuingAgency: baseInput.issuingAgency,
      issueDate: baseInput.issueDate,
      expirationDate: baseInput.expirationDate,
      status: LicenseStatus.REGULAR,
      documentUrl: 'https://storage.example.com/license.pdf',
    });
    expect(result).toEqual({ id: 'license-1' });
  });

  it('persists free-text type and issuing agency exactly as given', async () => {
    const { useCase, licenseRepository } = buildUseCase();

    await useCase.execute({
      ...baseInput,
      type: 'LAO',
      issuingAgency: 'Secretaria Municipal do Meio Ambiente',
    });

    expect(licenseRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'LAO',
        issuingAgency: 'Secretaria Municipal do Meio Ambiente',
      }),
    );
  });

  it('computes EXPIRED for a past expiration date', async () => {
    const { useCase, licenseRepository } = buildUseCase();

    await useCase.execute({
      ...baseInput,
      expirationDate: new Date('2020-02-10T00:00:00.000Z'),
    });

    expect(licenseRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: LicenseStatus.EXPIRED }),
    );
  });

  it('computes ATTENTION for an expiration date 15 days from now', async () => {
    const { useCase, licenseRepository } = buildUseCase();
    const in15Days = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

    await useCase.execute({
      ...baseInput,
      issueDate: new Date(),
      expirationDate: in15Days,
    });

    expect(licenseRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: LicenseStatus.ATTENTION }),
    );
  });
});
