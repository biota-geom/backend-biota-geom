import {
  ConditionStatus,
  LicenseStatus,
  LicenseType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateLicenseData } from '../domain/create-license.data';
import { PrismaLicenseRepository } from './prisma-license.repository';

function prismaWithTransaction(transactionClient: object): {
  prisma: PrismaService;
  runTransaction: jest.Mock;
} {
  const runTransaction = jest.fn(
    async (callback: (client: unknown) => Promise<unknown>) =>
      callback(transactionClient),
  );

  return {
    prisma: { $transaction: runTransaction } as unknown as PrismaService,
    runTransaction,
  };
}

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

  it('finds a license only within its customer and includes ordered conditions', async () => {
    const findFirst = jest.fn().mockResolvedValue({ id: 'license-1' });
    const repository = new PrismaLicenseRepository({
      license: { findFirst },
    } as unknown as PrismaService);

    await expect(
      repository.findByIdForCustomer('license-1', 'customer-1'),
    ).resolves.toEqual({ id: 'license-1' });
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'license-1', customerId: 'customer-1' },
      include: { conditions: { orderBy: { itemNumber: 'asc' } } },
    });
  });

  it('creates a license condition category', async () => {
    const category = {
      id: 'category-1',
      name: 'Documental',
      createdAt: new Date('2026-09-29T00:00:00.000Z'),
      updatedAt: new Date('2026-09-29T00:00:00.000Z'),
    };
    const create = jest.fn().mockResolvedValue(category);
    const repository = new PrismaLicenseRepository({
      licenseConditionCategory: { create },
    } as unknown as PrismaService);

    await expect(
      repository.createConditionCategory('Documental'),
    ).resolves.toEqual(category);
    expect(create).toHaveBeenCalledWith({ data: { name: 'Documental' } });
  });

  it('updates only the supplied fields after confirming the condition scope', async () => {
    const condition = { id: 'condition-1' };
    const findFirst = jest.fn().mockResolvedValue(condition);
    const update = jest.fn().mockResolvedValue(condition);
    const { prisma, runTransaction } = prismaWithTransaction({
      licenseCondition: { findFirst, update },
    });
    const repository = new PrismaLicenseRepository(prisma);
    const data = {
      id: 'condition-1',
      licenseId: 'license-1',
      customerId: 'customer-1',
      data: { status: ConditionStatus.FULFILLED },
    };

    await expect(repository.updateCondition(data)).resolves.toBe(condition);
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: 'condition-1',
        licenseId: 'license-1',
        license: { customerId: 'customer-1' },
      },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'condition-1' },
      data: { status: ConditionStatus.FULFILLED },
    });
    expect(runTransaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });

  it('does not update a condition outside the requested scope', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const update = jest.fn();
    const { prisma } = prismaWithTransaction({
      licenseCondition: { findFirst, update },
    });
    const repository = new PrismaLicenseRepository(prisma);

    await expect(
      repository.updateCondition({
        id: 'condition-1',
        licenseId: 'license-1',
        customerId: 'customer-1',
        data: { itemNumber: '1.2' },
      }),
    ).rejects.toThrow('License condition "condition-1" does not exist');
    expect(update).not.toHaveBeenCalled();
  });

  it('deletes a condition only when it belongs to the requested license and customer', async () => {
    const condition = { id: 'condition-1' };
    const findFirst = jest.fn().mockResolvedValue(condition);
    const remove = jest.fn().mockResolvedValue(condition);
    const { prisma, runTransaction } = prismaWithTransaction({
      licenseCondition: { findFirst, delete: remove },
    });
    const repository = new PrismaLicenseRepository(prisma);

    await expect(
      repository.deleteCondition('condition-1', 'license-1', 'customer-1'),
    ).resolves.toBe(condition);
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: 'condition-1',
        licenseId: 'license-1',
        license: { customerId: 'customer-1' },
      },
    });
    expect(remove).toHaveBeenCalledWith({ where: { id: 'condition-1' } });
    expect(runTransaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });
});
