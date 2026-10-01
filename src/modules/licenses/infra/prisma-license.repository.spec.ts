import { LicenseStatus, LicenseType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateLicenseData } from '../domain/create-license.data';
import { PrismaLicenseRepository } from './prisma-license.repository';

describe('PrismaLicenseRepository', () => {
  it('creates a license connected to its customer and issuing agency', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'license-1' });
    const repository = new PrismaLicenseRepository({
      license: { create },
    } as unknown as PrismaService);

    const data: CreateLicenseData = {
      customerId: 'customer-1',
      type: LicenseType.LO,
      processNumber: 'LO nº 118/2020',
      issuingAgencyId: 'agency-1',
      issueDate: new Date('2020-01-10T00:00:00.000Z'),
      expirationDate: new Date('2025-01-10T00:00:00.000Z'),
      status: LicenseStatus.EXPIRED,
      documentUrl: 'https://storage.example.com/license.pdf',
    };

    await expect(repository.create(data)).resolves.toEqual({
      id: 'license-1',
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        customer: { connect: { id: 'customer-1' } },
        type: LicenseType.LO,
        processNumber: 'LO nº 118/2020',
        issuingAgency: { connect: { id: 'agency-1' } },
        issueDate: data.issueDate,
        expirationDate: data.expirationDate,
        status: LicenseStatus.EXPIRED,
        documentUrl: 'https://storage.example.com/license.pdf',
      },
      include: { issuingAgency: true },
    });
  });

  it('finds all licenses for a customer ordered by soonest expiration first', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'license-1' }]);
    const repository = new PrismaLicenseRepository({
      license: { findMany },
    } as unknown as PrismaService);

    await expect(repository.findAllByCustomerId('customer-1')).resolves.toEqual(
      [{ id: 'license-1' }],
    );
    expect(findMany).toHaveBeenCalledWith({
      where: { customerId: 'customer-1' },
      include: { issuingAgency: true },
      orderBy: { expirationDate: 'asc' },
    });
  });

  it('finds a license by id with its issuing agency', async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: 'license-1' });
    const repository = new PrismaLicenseRepository({
      license: { findUnique },
    } as unknown as PrismaService);

    await expect(repository.findById('license-1')).resolves.toEqual({
      id: 'license-1',
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'license-1' },
      include: { issuingAgency: true },
    });
  });

  it('creates conditions and returns the count', async () => {
    const createMany = jest.fn().mockResolvedValue({ count: 2 });
    const repository = new PrismaLicenseRepository({
      licenseCondition: { createMany },
    } as unknown as PrismaService);

    await expect(repository.createConditions([])).resolves.toEqual({
      count: 2,
    });
    expect(createMany).toHaveBeenCalledWith({ data: [] });
  });

  it('finds a customer license and maps its conditions', async () => {
    const findFirst = jest.fn().mockResolvedValue({
      id: 'license-1',
      conditions: [{ name: 'MTR', conditionStatus: 'IN_PROGRESS' }],
    });
    const repository = new PrismaLicenseRepository({
      license: { findFirst },
    } as unknown as PrismaService);

    await expect(
      repository.findByIdForCustomer('license-1', 'customer-1'),
    ).resolves.toEqual({
      id: 'license-1',
      conditions: [
        expect.objectContaining({
          name: 'MTR',
          title: 'MTR',
          status: 'IN_PROGRESS',
        }),
      ],
    });
  });

  it('updates an owned condition inside a transaction', async () => {
    const update = jest.fn().mockResolvedValue({
      name: 'Atualizada',
      conditionStatus: 'IN_PROGRESS',
    });
    const transaction = jest.fn((callback: (tx: unknown) => unknown) =>
      callback({
        licenseCondition: {
          findFirst: jest.fn().mockResolvedValue({ id: 'condition-1' }),
          update,
        },
      }),
    );
    const repository = new PrismaLicenseRepository({
      $transaction: transaction,
    } as unknown as PrismaService);

    await expect(
      repository.updateCondition({
        id: 'condition-1',
        licenseId: 'license-1',
        customerId: 'customer-1',
        data: { title: 'Atualizada' },
      }),
    ).resolves.toEqual(expect.objectContaining({ title: 'Atualizada' }));
    expect(update).toHaveBeenCalledWith({
      where: { id: 'condition-1' },
      data: { name: 'Atualizada' },
    });
  });

  it('rejects updating a missing condition', async () => {
    const transaction = jest.fn((callback: (tx: unknown) => unknown) =>
      callback({
        licenseCondition: {
          findFirst: jest.fn().mockResolvedValue(null),
          update: jest.fn(),
        },
      }),
    );
    const repository = new PrismaLicenseRepository({
      $transaction: transaction,
    } as unknown as PrismaService);

    await expect(
      repository.updateCondition({
        id: 'condition-1',
        licenseId: 'license-1',
        customerId: 'customer-1',
        data: {},
      }),
    ).rejects.toThrow();
  });

  it('maps status and violation fields when updating a condition', async () => {
    const update = jest.fn().mockResolvedValue({
      name: 'Atualizada',
      conditionStatus: 'OVERDUE',
    });
    const transaction = jest.fn((callback: (tx: unknown) => unknown) =>
      callback({
        licenseCondition: {
          findFirst: jest.fn().mockResolvedValue({ id: 'condition-1' }),
          update,
        },
      }),
    );
    const repository = new PrismaLicenseRepository({
      $transaction: transaction,
    } as unknown as PrismaService);

    await repository.updateCondition({
      id: 'condition-1',
      licenseId: 'license-1',
      customerId: 'customer-1',
      data: { status: 'OVERDUE', isViolated: true },
    });

    expect(update).toHaveBeenCalledWith({
      where: { id: 'condition-1' },
      data: { conditionStatus: 'OVERDUE', isViolated: true },
    });
  });

  it('deletes an owned condition inside a transaction', async () => {
    const deleteCondition = jest.fn().mockResolvedValue({
      name: 'MTR',
      conditionStatus: 'IN_PROGRESS',
    });
    const transaction = jest.fn((callback: (tx: unknown) => unknown) =>
      callback({
        licenseCondition: {
          findFirst: jest.fn().mockResolvedValue({ id: 'condition-1' }),
          delete: deleteCondition,
        },
      }),
    );
    const repository = new PrismaLicenseRepository({
      $transaction: transaction,
    } as unknown as PrismaService);

    await expect(
      repository.deleteCondition('condition-1', 'license-1', 'customer-1'),
    ).resolves.toEqual(expect.objectContaining({ title: 'MTR' }));
  });
});
