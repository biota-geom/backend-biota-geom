import { LicenseStatus } from '@prisma/client';
import { LicenseAlreadyArchivedError } from '../domain/errors/license-already-archived.error';
import { InvalidLicenseDateRangeError } from '../domain/errors/invalid-license-date-range.error';
import { LicenseNotFoundError } from '../domain/errors/license-not-found.error';
import { FileStorage } from '../../../common/storage/file-storage';
import { LicenseRepository } from '../domain/licenses.repository';
import { RenewLicenseUseCase } from './renew-license.use-case';

function buildUseCase(overrides?: {
  licenseRepository?: Partial<LicenseRepository>;
  documentStorage?: Partial<FileStorage>;
}) {
  const licenseRepository: Partial<LicenseRepository> = {
    findByIdForOwner: jest.fn().mockResolvedValue({
      id: 'old-license',
      customerId: 'customer-1',
      type: 'LO',
      processNumber: 'LO nº 118/2020',
      issuingAgency: 'FEPAM',
      issueDate: new Date('2020-01-10T00:00:00.000Z'),
      expirationDate: new Date('2025-01-10T00:00:00.000Z'),
      status: LicenseStatus.EXPIRED,
      documentUrl: 'https://storage.example.com/old.pdf',
      createdAt: new Date('2020-01-10T00:00:00.000Z'),
      updatedAt: new Date('2020-01-10T00:00:00.000Z'),
    }),
    renew: jest.fn().mockImplementation((data) =>
      Promise.resolve({
        id: 'new-license',
        ...data,
        createdAt: new Date('2026-01-10T00:00:00.000Z'),
        updatedAt: new Date('2026-01-10T00:00:00.000Z'),
      }),
    ),
    ...overrides?.licenseRepository,
  };
  const documentStorage: Partial<FileStorage> = {
    upload: jest.fn().mockResolvedValue({
      url: 'https://storage.example.com/new.pdf',
    }),
    ...overrides?.documentStorage,
  };

  const useCase = new RenewLicenseUseCase(
    licenseRepository as LicenseRepository,
    documentStorage as FileStorage,
  );

  return { useCase, licenseRepository, documentStorage };
}

const FILE = {
  buffer: Buffer.from('%PDF-1.4'),
  originalName: 'renovada.pdf',
  mimeType: 'application/pdf',
};

describe('RenewLicenseUseCase', () => {
  it('creates a new license from the previous one and archives it transactionally in the repository', async () => {
    const { useCase, licenseRepository, documentStorage } = buildUseCase();

    const result = await useCase.execute({
      licenseId: 'old-license',
      ownerUserId: 'owner-1',
      processNumber: 'LO nº 119/2026',
      issueDate: new Date('2026-01-10T00:00:00.000Z'),
      expirationDate: new Date('2030-01-10T00:00:00.000Z'),
      file: FILE,
    });

    expect(licenseRepository.findByIdForOwner).toHaveBeenCalledWith(
      'old-license',
      'owner-1',
    );
    expect(documentStorage.upload).toHaveBeenCalledWith(FILE, {
      category: 'licenses',
      customerId: 'customer-1',
    });
    expect(licenseRepository.renew).toHaveBeenCalledWith(
      expect.objectContaining({
        previousLicenseId: 'old-license',
        customerId: 'customer-1',
        type: 'LO',
        processNumber: 'LO nº 119/2026',
        issuingAgency: 'FEPAM',
        status: LicenseStatus.REGULAR,
        documentUrl: 'https://storage.example.com/new.pdf',
      }),
    );
    expect(result).toEqual(expect.objectContaining({ id: 'new-license' }));
  });

  it('returns 404 semantics when the license is missing or belongs to another owner', async () => {
    const { useCase, documentStorage } = buildUseCase({
      licenseRepository: {
        findByIdForOwner: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(
      useCase.execute({
        licenseId: 'old-license',
        ownerUserId: 'owner-1',
        processNumber: 'LO nº 119/2026',
        issueDate: new Date('2026-01-10T00:00:00.000Z'),
        expirationDate: new Date('2030-01-10T00:00:00.000Z'),
        file: FILE,
      }),
    ).rejects.toThrow(LicenseNotFoundError);
    expect(documentStorage.upload).not.toHaveBeenCalled();
  });

  it('does not renew an archived license', async () => {
    const { useCase, documentStorage } = buildUseCase({
      licenseRepository: {
        findByIdForOwner: jest.fn().mockResolvedValue({
          id: 'old-license',
          status: LicenseStatus.ARCHIVED,
        }),
      },
    });

    await expect(
      useCase.execute({
        licenseId: 'old-license',
        ownerUserId: 'owner-1',
        processNumber: 'LO nº 119/2026',
        issueDate: new Date('2026-01-10T00:00:00.000Z'),
        expirationDate: new Date('2030-01-10T00:00:00.000Z'),
        file: FILE,
      }),
    ).rejects.toThrow(LicenseAlreadyArchivedError);
    expect(documentStorage.upload).not.toHaveBeenCalled();
  });

  it('validates the renewed license date range before uploading the file', async () => {
    const { useCase, documentStorage } = buildUseCase();

    await expect(
      useCase.execute({
        licenseId: 'old-license',
        ownerUserId: 'owner-1',
        processNumber: 'LO nº 119/2026',
        issueDate: new Date('2026-01-10T00:00:00.000Z'),
        expirationDate: new Date('2026-01-10T00:00:00.000Z'),
        file: FILE,
      }),
    ).rejects.toThrow(InvalidLicenseDateRangeError);
    expect(documentStorage.upload).not.toHaveBeenCalled();
  });
});
