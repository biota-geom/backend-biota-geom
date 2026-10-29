import { LicenseStatus } from '@prisma/client';
import { LicenseAlreadyArchivedError } from '../domain/errors/license-already-archived.error';
import { InvalidLicenseDateRangeError } from '../domain/errors/invalid-license-date-range.error';
import { LicenseNotFoundError } from '../domain/errors/license-not-found.error';
import { FileStorage } from '../../../common/storage/file-storage';
import { LicenseRepository } from '../domain/licenses.repository';
import { DuplicateRenewalConditionError } from '../domain/errors/duplicate-renewal-condition.error';
import { InvalidRenewalDueDateError } from '../domain/errors/invalid-renewal-due-date.error';
import { RenewalConditionsOutdatedError } from '../domain/errors/renewal-conditions-outdated.error';
import { RenewLicenseUseCase } from './renew-license.use-case';

function buildUseCase(overrides?: {
  licenseRepository?: Partial<LicenseRepository>;
  documentStorage?: Partial<FileStorage>;
}) {
  const licenseRepository: Partial<LicenseRepository> = {
    findByIdForOwnerWithConditions: jest.fn().mockResolvedValue({
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
      conditions: [],
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
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-15T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates a new license from the previous one and archives it transactionally in the repository', async () => {
    const { useCase, licenseRepository, documentStorage } = buildUseCase();

    const result = await useCase.execute({
      licenseId: 'old-license',
      ownerUserId: 'owner-1',
      processNumber: 'LO nº 119/2026',
      issueDate: new Date('2026-01-10T00:00:00.000Z'),
      expirationDate: new Date('2030-01-10T00:00:00.000Z'),
      file: FILE,
      conditions: [],
    });

    expect(
      licenseRepository.findByIdForOwnerWithConditions,
    ).toHaveBeenCalledWith('old-license', 'owner-1');
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
        findByIdForOwnerWithConditions: jest.fn().mockResolvedValue(null),
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
        conditions: [],
      }),
    ).rejects.toThrow(LicenseNotFoundError);
    expect(documentStorage.upload).not.toHaveBeenCalled();
  });

  it('does not renew an archived license', async () => {
    const { useCase, documentStorage } = buildUseCase({
      licenseRepository: {
        findByIdForOwnerWithConditions: jest.fn().mockResolvedValue({
          id: 'old-license',
          status: LicenseStatus.ARCHIVED,
          conditions: [],
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
        conditions: [],
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
        conditions: [],
      }),
    ).rejects.toThrow(InvalidLicenseDateRangeError);
    expect(documentStorage.upload).not.toHaveBeenCalled();
  });

  describe('conditions of the previous license', () => {
    const baseInput = {
      licenseId: 'old-license',
      ownerUserId: 'owner-1',
      processNumber: 'LO nº 119/2026',
      issueDate: new Date('2026-01-10T00:00:00.000Z'),
      expirationDate: new Date('2030-01-10T00:00:00.000Z'),
      file: FILE,
    };
    const withConditions = () =>
      jest.fn().mockResolvedValue({
        id: 'old-license',
        customerId: 'customer-1',
        type: 'LO',
        issuingAgency: 'FEPAM',
        status: LicenseStatus.REGULAR,
        conditions: [{ id: 'c-1' }, { id: 'c-2' }, { id: 'c-3' }],
      });
    const keep = (conditionId: string) => ({
      conditionId,
      fulfilled: true,
      copyToNew: false,
    });

    it('passes every decision to the repository when all conditions are marked', async () => {
      const { useCase, licenseRepository } = buildUseCase({
        licenseRepository: { findByIdForOwnerWithConditions: withConditions() },
      });
      const conditions = [
        {
          conditionId: 'c-1',
          fulfilled: true,
          copyToNew: true,
          newDueDate: new Date('2027-10-01T00:00:00.000Z'),
        },
        { conditionId: 'c-2', fulfilled: false, copyToNew: false },
        {
          conditionId: 'c-3',
          fulfilled: true,
          copyToNew: true,
          newDueDate: new Date('2027-11-01T00:00:00.000Z'),
        },
      ];

      await useCase.execute({ ...baseInput, conditions });

      expect(licenseRepository.renew).toHaveBeenCalledWith(
        expect.objectContaining({ conditions }),
      );
    });

    it('rejects the renewal as outdated when some condition was not marked', async () => {
      const { useCase, documentStorage, licenseRepository } = buildUseCase({
        licenseRepository: { findByIdForOwnerWithConditions: withConditions() },
      });

      await expect(
        useCase.execute({ ...baseInput, conditions: [keep('c-1')] }),
      ).rejects.toThrow(RenewalConditionsOutdatedError);
      expect(documentStorage.upload).not.toHaveBeenCalled();
      expect(licenseRepository.renew).not.toHaveBeenCalled();
    });

    it('rejects the renewal when a condition is marked twice', async () => {
      const { useCase, documentStorage } = buildUseCase({
        licenseRepository: { findByIdForOwnerWithConditions: withConditions() },
      });

      await expect(
        useCase.execute({
          ...baseInput,
          conditions: [keep('c-1'), keep('c-1'), keep('c-2'), keep('c-3')],
        }),
      ).rejects.toThrow(DuplicateRenewalConditionError);
      expect(documentStorage.upload).not.toHaveBeenCalled();
    });

    it('rejects as outdated a condition id that is no longer on the previous license', async () => {
      const { useCase, documentStorage } = buildUseCase({
        licenseRepository: { findByIdForOwnerWithConditions: withConditions() },
      });

      await expect(
        useCase.execute({
          ...baseInput,
          conditions: [keep('c-1'), keep('c-2'), keep('other')],
        }),
      ).rejects.toThrow(RenewalConditionsOutdatedError);
      expect(documentStorage.upload).not.toHaveBeenCalled();
    });

    it.each([
      ['missing', undefined],
      ['in the past', new Date('2026-06-14T00:00:00.000Z')],
      ['after the new expiration date', new Date('2030-01-11T00:00:00.000Z')],
    ])(
      'rejects a copied condition whose new due date is %s',
      async (_case, newDueDate) => {
        const { useCase, documentStorage } = buildUseCase({
          licenseRepository: {
            findByIdForOwnerWithConditions: withConditions(),
          },
        });

        await expect(
          useCase.execute({
            ...baseInput,
            conditions: [
              {
                conditionId: 'c-1',
                fulfilled: true,
                copyToNew: true,
                newDueDate,
              },
              keep('c-2'),
              keep('c-3'),
            ],
          }),
        ).rejects.toThrow(InvalidRenewalDueDateError);
        expect(documentStorage.upload).not.toHaveBeenCalled();
      },
    );

    it.each([
      ['today', new Date('2026-06-15T00:00:00.000Z')],
      ['the new expiration date', new Date('2030-01-10T00:00:00.000Z')],
    ])('accepts a new due date on %s', async (_case, newDueDate) => {
      const { useCase, licenseRepository } = buildUseCase({
        licenseRepository: { findByIdForOwnerWithConditions: withConditions() },
      });

      await useCase.execute({
        ...baseInput,
        conditions: [
          { conditionId: 'c-1', fulfilled: true, copyToNew: true, newDueDate },
          keep('c-2'),
          keep('c-3'),
        ],
      });

      expect(licenseRepository.renew).toHaveBeenCalled();
    });
  });
});
