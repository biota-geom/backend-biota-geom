import { ConditionStatus, LicenseStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateLicenseData } from '../domain/create-license.data';
import { LicenseConditionNotFoundError } from '../domain/errors/license-condition-not-found.error';
import { PrismaLicenseRepository } from './prisma-license.repository';

describe('PrismaLicenseRepository', () => {
  it('creates a license connected to its customer', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'license-1' });
    const repository = new PrismaLicenseRepository({
      license: { create },
    } as unknown as PrismaService);

    const data: CreateLicenseData = {
      customerId: 'customer-1',
      type: 'LO',
      processNumber: 'LO nº 118/2020',
      issuingAgency: 'FEPAM',
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
        type: 'LO',
        processNumber: 'LO nº 118/2020',
        issuingAgency: 'FEPAM',
        issueDate: data.issueDate,
        expirationDate: data.expirationDate,
        status: LicenseStatus.EXPIRED,
        documentUrl: 'https://storage.example.com/license.pdf',
        previousLicense: undefined,
      },
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
        type: 'LO',
        processNumber: 'LO nº 119/2026',
        issuingAgency: 'FEPAM',
        issueDate,
        expirationDate,
        status: LicenseStatus.REGULAR,
        documentUrl: 'https://storage.example.com/new.pdf',
        conditions: [],
      }),
    ).resolves.toEqual({ id: 'new-license' });

    expect(create).toHaveBeenCalledWith({
      data: {
        customer: { connect: { id: 'customer-1' } },
        type: 'LO',
        processNumber: 'LO nº 119/2026',
        issuingAgency: 'FEPAM',
        issueDate,
        expirationDate,
        status: LicenseStatus.REGULAR,
        documentUrl: 'https://storage.example.com/new.pdf',
        previousLicense: { connect: { id: 'old-license' } },
      },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'old-license' },
      data: { status: LicenseStatus.ARCHIVED },
    });
  });

  it('records fulfillment of the previous conditions and copies the marked ones to the renewed license', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'new-license' });
    const update = jest.fn().mockResolvedValue({ id: 'old-license' });
    const conditionUpdate = jest.fn().mockResolvedValue({});
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'c-1',
        name: 'Relatório',
        environmentalDescriptor: 'Resíduos',
        description: 'Descrição',
        responsibleAgency: 'FEPAM',
        responsibleName: 'Ana',
        conditionType: 'PERIODIC',
        periodicity: 'ANNUAL',
        hasDelivery: true,
      },
    ]);
    const createMany = jest.fn().mockResolvedValue({ count: 1 });
    const transaction = jest.fn((callback: (tx: unknown) => unknown) =>
      callback({
        license: { create, update },
        licenseCondition: { update: conditionUpdate, findMany, createMany },
      }),
    );
    const repository = new PrismaLicenseRepository({
      $transaction: transaction,
    } as unknown as PrismaService);
    const newDueDate = new Date('2027-10-01T00:00:00.000Z');

    await repository.renew({
      previousLicenseId: 'old-license',
      customerId: 'customer-1',
      type: 'LO',
      processNumber: 'LO nº 119/2026',
      issuingAgency: 'FEPAM',
      issueDate: new Date('2026-01-10T00:00:00.000Z'),
      expirationDate: new Date('2030-01-10T00:00:00.000Z'),
      status: LicenseStatus.REGULAR,
      documentUrl: 'https://storage.example.com/new.pdf',
      conditions: [
        { conditionId: 'c-1', fulfilled: true, copyToNew: true, newDueDate },
        { conditionId: 'c-2', fulfilled: false, copyToNew: false },
      ],
    });

    expect(conditionUpdate).toHaveBeenCalledWith({
      where: { id: 'c-1' },
      data: {
        conditionStatus: ConditionStatus.FULFILLED,
        completionDate: expect.any(Date) as Date,
      },
    });
    expect(conditionUpdate).toHaveBeenCalledWith({
      where: { id: 'c-2' },
      data: {
        conditionStatus: ConditionStatus.IN_PROGRESS,
        completionDate: null,
      },
    });
    expect(findMany).toHaveBeenCalledWith({
      where: { licenseId: 'old-license', id: { in: ['c-1'] } },
      orderBy: { createdAt: 'asc' },
    });
    expect(createMany).toHaveBeenCalledWith({
      data: [
        {
          licenseId: 'new-license',
          name: 'Relatório',
          environmentalDescriptor: 'Resíduos',
          description: 'Descrição',
          responsibleAgency: 'FEPAM',
          responsibleName: 'Ana',
          conditionType: 'PERIODIC',
          periodicity: 'ANNUAL',
          hasDelivery: true,
          dueDate: newDueDate,
        },
      ],
    });
  });

  it('does not copy any condition when none is marked to be copied', async () => {
    const createMany = jest.fn();
    const transaction = jest.fn((callback: (tx: unknown) => unknown) =>
      callback({
        license: {
          create: jest.fn().mockResolvedValue({ id: 'new-license' }),
          update: jest.fn(),
        },
        licenseCondition: { update: jest.fn(), createMany },
      }),
    );
    const repository = new PrismaLicenseRepository({
      $transaction: transaction,
    } as unknown as PrismaService);

    await repository.renew({
      previousLicenseId: 'old-license',
      customerId: 'customer-1',
      type: 'LO',
      processNumber: 'LO nº 119/2026',
      issuingAgency: 'FEPAM',
      issueDate: new Date('2026-01-10T00:00:00.000Z'),
      expirationDate: new Date('2030-01-10T00:00:00.000Z'),
      status: LicenseStatus.REGULAR,
      documentUrl: 'https://storage.example.com/new.pdf',
      conditions: [{ conditionId: 'c-1', fulfilled: true, copyToNew: false }],
    });

    expect(createMany).not.toHaveBeenCalled();
  });

  it('lists the conditions of a license oldest first, mapped to the domain shape', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValue([
        { id: 'c-1', name: 'Relatório', conditionStatus: 'IN_PROGRESS' },
      ]);
    const repository = new PrismaLicenseRepository({
      licenseCondition: { findMany },
    } as unknown as PrismaService);

    await expect(
      repository.findConditionsByLicenseId('license-1'),
    ).resolves.toEqual([
      expect.objectContaining({ id: 'c-1', title: 'Relatório' }),
    ]);
    expect(findMany).toHaveBeenCalledWith({
      where: { licenseId: 'license-1' },
      orderBy: { createdAt: 'asc' },
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
      orderBy: { expirationDate: 'asc' },
    });
  });

  it('finds a license by id', async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: 'license-1' });
    const repository = new PrismaLicenseRepository({
      license: { findUnique },
    } as unknown as PrismaService);

    await expect(repository.findById('license-1')).resolves.toEqual({
      id: 'license-1',
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'license-1' },
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
      include: { conditions: { orderBy: { createdAt: 'asc' } } },
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

  it('rejects deleting a missing condition', async () => {
    const transaction = jest.fn((callback: (tx: unknown) => unknown) =>
      callback({
        licenseCondition: {
          findFirst: jest.fn().mockResolvedValue(null),
          delete: jest.fn(),
        },
      }),
    );
    const repository = new PrismaLicenseRepository({
      $transaction: transaction,
    } as unknown as PrismaService);

    await expect(
      repository.deleteCondition(
        'missing-condition',
        'license-1',
        'customer-1',
      ),
    ).rejects.toBeInstanceOf(LicenseConditionNotFoundError);
  });

  it('returns null when license is not found for customer', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const repository = new PrismaLicenseRepository({
      license: { findFirst },
    } as unknown as PrismaService);

    await expect(
      repository.findByIdForCustomer('missing-id', 'customer-1'),
    ).resolves.toBeNull();
  });

  it('saves conditions fulfillment with FULFILLED and IN_PROGRESS statuses', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'ok' });
    const transaction = jest.fn(async (promises: unknown[]) =>
      Promise.all(promises),
    );
    const repository = new PrismaLicenseRepository({
      $transaction: transaction,
      licenseCondition: { update },
    } as unknown as PrismaService);

    await repository.saveConditionsFulfillment({
      licenseId: 'license-1',
      customerId: 'customer-1',
      items: [
        { conditionId: 'c-1', fulfilled: true },
        { conditionId: 'c-2', fulfilled: false },
      ],
    });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenNthCalledWith(1, {
      where: { id: 'c-1' },
      data: {
        conditionStatus: ConditionStatus.FULFILLED,
        completionDate: expect.any(Date) as Date,
      },
    });
    expect(update).toHaveBeenNthCalledWith(2, {
      where: { id: 'c-2' },
      data: {
        conditionStatus: ConditionStatus.IN_PROGRESS,
        completionDate: null,
      },
    });
  });
});
