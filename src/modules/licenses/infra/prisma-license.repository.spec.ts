import { LicenseStatus, LicenseType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateLicenseData } from '../domain/create-license.data';
import { LicenseConditionNotFoundError } from '../domain/errors/license-condition-not-found.error';
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
        previousLicense: undefined,
      },
      include: { issuingAgency: true },
    });
  });

  it('renews a license by creating the new one and archiving the previous one in a transaction', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'new-license' });
    const update = jest.fn().mockResolvedValue({ id: 'old-license' });
    const transaction = jest.fn((callback: (tx: unknown) => unknown) =>
      callback({ license: { create, update } }),
    );
    const repository = new PrismaLicenseRepository({
      $transaction: transaction,
    } as unknown as PrismaService);

    const issueDate = new Date('2026-01-10T00:00:00.000Z');
    const expirationDate = new Date('2030-01-10T00:00:00.000Z');

    await expect(
      repository.renew({
        previousLicenseId: 'old-license',
        customerId: 'customer-1',
        type: LicenseType.LO,
        processNumber: 'LO nº 119/2026',
        issuingAgencyId: 'agency-1',
        issueDate,
        expirationDate,
        status: LicenseStatus.REGULAR,
        documentUrl: 'https://storage.example.com/new.pdf',
      }),
    ).resolves.toEqual({ id: 'new-license' });

    expect(create).toHaveBeenCalledWith({
      data: {
        customer: { connect: { id: 'customer-1' } },
        type: LicenseType.LO,
        processNumber: 'LO nº 119/2026',
        issuingAgency: { connect: { id: 'agency-1' } },
        issueDate,
        expirationDate,
        status: LicenseStatus.REGULAR,
        documentUrl: 'https://storage.example.com/new.pdf',
        previousLicense: { connect: { id: 'old-license' } },
      },
      include: { issuingAgency: true },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'old-license' },
      data: { status: LicenseStatus.ARCHIVED },
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

  it('finds a license by id only when it belongs to the authenticated owner', async () => {
    const findFirst = jest.fn().mockResolvedValue({ id: 'license-1' });
    const repository = new PrismaLicenseRepository({
      license: { findFirst },
    } as unknown as PrismaService);

    await expect(
      repository.findByIdForOwner('license-1', 'owner-1'),
    ).resolves.toEqual({ id: 'license-1' });
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'license-1', customer: { ownerUserId: 'owner-1' } },
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
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'license-1', customerId: 'customer-1' },
      include: {
        issuingAgency: true,
        conditions: { orderBy: { createdAt: 'asc' } },
      },
    });
  });

  it('finds all customer licenses and maps their ordered conditions', async () => {
    const licenses = [
      {
        id: 'license-1',
        conditions: [
          {
            id: 'condition-1',
            name: 'MTR',
            conditionStatus: 'IN_PROGRESS',
            itemNumber: '1',
          },
        ],
      },
      {
        id: 'license-2',
        conditions: [],
      },
    ];
    const findMany = jest.fn().mockResolvedValue(licenses);
    const repository = new PrismaLicenseRepository({
      license: { findMany },
    } as unknown as PrismaService);

    await expect(
      repository.findCustomerLicenses('customer-1'),
    ).resolves.toEqual([
      {
        id: 'license-1',
        conditions: [
          expect.objectContaining({
            id: 'condition-1',
            name: 'MTR',
            title: 'MTR',
            conditionStatus: 'IN_PROGRESS',
            status: 'IN_PROGRESS',
          }),
        ],
      },
      {
        id: 'license-2',
        conditions: [],
      },
    ]);
    expect(findMany).toHaveBeenCalledWith({
      where: { customerId: 'customer-1' },
      include: { conditions: { orderBy: { itemNumber: 'asc' } } },
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

  it('moves a condition to the end of a new environmental descriptor', async () => {
    const update = jest.fn((updateArguments: unknown) => {
      void updateArguments;
      return Promise.resolve({
        name: 'Atualizada',
        conditionStatus: 'IN_PROGRESS',
      });
    });
    const transaction = jest.fn((callback: (tx: unknown) => unknown) =>
      callback({
        licenseCondition: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'condition-1',
            environmentalDescriptor: 'Água',
          }),
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
      data: { environmentalDescriptor: 'Resíduos' },
    });

    const updateArguments: unknown = update.mock.calls[0]?.[0];
    expect(updateArguments).toMatchObject({
      where: { id: 'condition-1' },
      data: {
        environmentalDescriptor: 'Resíduos',
      },
    });
    expect(
      (updateArguments as { data: { createdAt: unknown } }).data.createdAt,
    ).toBeInstanceOf(Date);
  });

  it('updates a condition that belongs to the authenticated owner', async () => {
    const findFirst = jest.fn().mockResolvedValue({
      id: 'condition-1',
      environmentalDescriptor: 'Water',
    });
    const update = jest.fn((updateArguments: unknown) => {
      void updateArguments;
      return Promise.resolve({
        name: 'Updated condition',
        conditionStatus: 'OVERDUE',
        environmentalDescriptor: 'Waste',
        isViolated: true,
      });
    });
    const transaction = jest.fn((callback: (tx: unknown) => unknown) =>
      callback({ licenseCondition: { findFirst, update } }),
    );
    const repository = new PrismaLicenseRepository({
      $transaction: transaction,
    } as unknown as PrismaService);

    await expect(
      repository.updateConditionForOwner('condition-1', 'owner-1', {
        title: 'Updated condition',
        status: 'OVERDUE',
        isViolated: true,
        environmentalDescriptor: 'Waste',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        title: 'Updated condition',
        status: 'OVERDUE',
      }),
    );
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: 'condition-1',
        license: { customer: { ownerUserId: 'owner-1' } },
      },
    });
    const updateArguments: unknown = update.mock.calls[0]?.[0];
    expect(updateArguments).toMatchObject({
      where: { id: 'condition-1' },
      data: {
        name: 'Updated condition',
        conditionStatus: 'OVERDUE',
        isViolated: true,
        environmentalDescriptor: 'Waste',
      },
    });
    expect(
      (updateArguments as { data: { createdAt: unknown } }).data.createdAt,
    ).toBeInstanceOf(Date);
  });

  it('does not reorder a condition when its environmental descriptor is unchanged', async () => {
    const update = jest.fn().mockResolvedValue({
      name: 'Condition',
      conditionStatus: 'IN_PROGRESS',
      environmentalDescriptor: 'Water',
    });
    const transaction = jest.fn((callback: (tx: unknown) => unknown) =>
      callback({
        licenseCondition: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'condition-1',
            environmentalDescriptor: 'Water',
          }),
          update,
        },
      }),
    );
    const repository = new PrismaLicenseRepository({
      $transaction: transaction,
    } as unknown as PrismaService);

    await repository.updateConditionForOwner('condition-1', 'owner-1', {
      environmentalDescriptor: 'Water',
    });

    expect(update).toHaveBeenCalledWith({
      where: { id: 'condition-1' },
      data: { environmentalDescriptor: 'Water' },
    });
  });

  it('updates a condition for an owner when no optional field is provided', async () => {
    const update = jest.fn().mockResolvedValue({
      name: 'Condition',
      conditionStatus: 'IN_PROGRESS',
      environmentalDescriptor: 'Water',
    });
    const transaction = jest.fn((callback: (tx: unknown) => unknown) =>
      callback({
        licenseCondition: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'condition-1',
            environmentalDescriptor: 'Water',
          }),
          update,
        },
      }),
    );
    const repository = new PrismaLicenseRepository({
      $transaction: transaction,
    } as unknown as PrismaService);

    await repository.updateConditionForOwner('condition-1', 'owner-1', {});

    expect(update).toHaveBeenCalledWith({
      where: { id: 'condition-1' },
      data: {},
    });
  });

  it('rejects updating an owner condition that does not exist', async () => {
    const update = jest.fn();
    const transaction = jest.fn((callback: (tx: unknown) => unknown) =>
      callback({
        licenseCondition: {
          findFirst: jest.fn().mockResolvedValue(null),
          update,
        },
      }),
    );
    const repository = new PrismaLicenseRepository({
      $transaction: transaction,
    } as unknown as PrismaService);

    await expect(
      repository.updateConditionForOwner('condition-1', 'owner-1', {}),
    ).rejects.toThrow(LicenseConditionNotFoundError);
    expect(update).not.toHaveBeenCalled();
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
