import {
  ConditionStatus,
  LegislationImpact,
  LicenseLegislationSource,
  LicenseStatus,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateLicenseData } from '../domain/create-license.data';
import { InvalidConditionAlertDateError } from '../domain/errors/invalid-condition-alert-date.error';
import { LicenseConditionNotFoundError } from '../domain/errors/license-condition-not-found.error';
import { RenewalConditionsOutdatedError } from '../domain/errors/renewal-conditions-outdated.error';
import { PrismaLicenseRepository } from './prisma-license.repository';

const CONDITION_ORDER = [
  { position: 'asc' },
  { createdAt: 'asc' },
  { id: 'asc' },
];

const RENEWAL = {
  previousLicenseId: 'old-license',
  customerId: 'customer-1',
  type: 'LO',
  processNumber: 'LO nº 119/2026',
  issuingAgency: 'FEPAM',
  issueDate: new Date('2026-01-10T00:00:00.000Z'),
  expirationDate: new Date('2030-01-10T00:00:00.000Z'),
  status: LicenseStatus.REGULAR,
  documentUrl: 'https://storage.example.com/new.pdf',
};

type ConditionCreateInput = {
  data: {
    licenseId: string;
    parentConditionId: string | null;
    name: string;
    environmentalDescriptor: string;
    description: string | null;
    responsibleAgency: string | null;
    responsibleName: string | null;
    conditionType: string | null;
    periodicity: string | null;
    hasDelivery: boolean;
    deadline: Date;
    dueDate: Date;
    position: number;
  };
};

const alertResolver = {
  resolveForLicense: jest.fn(),
  resolveForConditions: jest.fn(),
};

describe('PrismaLicenseRepository', () => {
  beforeEach(() => {
    alertResolver.resolveForLicense.mockReset().mockResolvedValue(0);
    alertResolver.resolveForConditions.mockReset().mockResolvedValue(0);
  });

  it('creates a license connected to its customer', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'license-1' });
    const repository = new PrismaLicenseRepository(
      {
        license: { create },
      } as unknown as PrismaService,
      alertResolver,
    );

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
      callback({
        license: { create, update },
        licenseCondition: { findMany: jest.fn().mockResolvedValue([]) },
        licenseLegislation: { findMany: jest.fn().mockResolvedValue([]) },
      }),
    );
    const repository = new PrismaLicenseRepository(
      {
        $transaction: transaction,
      } as unknown as PrismaService,
      alertResolver,
    );

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
    expect(alertResolver.resolveForLicense).toHaveBeenCalledWith(
      'old-license',
      expect.objectContaining({ license: { create, update } }),
    );
  });

  it('copies legislation links to the renewed license and resets their read state', async () => {
    const links = [
      {
        legislationId: 'legislation-1',
        source: LicenseLegislationSource.SCAN,
        citedExcerpt: 'Article 1',
        impact: LegislationImpact.HIGH,
        technicalAnalysis: 'Requires immediate action.',
      },
      {
        legislationId: 'legislation-2',
        source: LicenseLegislationSource.MANUAL,
        citedExcerpt: null,
        impact: null,
        technicalAnalysis: null,
      },
    ];
    const findMany = jest.fn().mockResolvedValue(links);
    const createMany = jest.fn().mockResolvedValue({ count: links.length });
    const transaction = jest.fn((callback: (tx: unknown) => unknown) =>
      callback({
        license: {
          create: jest.fn().mockResolvedValue({ id: 'new-license' }),
          update: jest.fn(),
        },
        licenseCondition: { findMany: jest.fn().mockResolvedValue([]) },
        licenseLegislation: { findMany, createMany },
      }),
    );
    const repository = new PrismaLicenseRepository(
      {
        $transaction: transaction,
      } as unknown as PrismaService,
      alertResolver,
    );

    await repository.renew({ ...RENEWAL, conditions: [] });

    expect(findMany).toHaveBeenCalledWith({
      where: { licenseId: 'old-license' },
      select: {
        legislationId: true,
        source: true,
        citedExcerpt: true,
        impact: true,
        technicalAnalysis: true,
      },
    });
    expect(createMany).toHaveBeenCalledWith({
      data: links.map((link) => ({
        ...link,
        licenseId: 'new-license',
        readAt: null,
      })),
    });
  });

  it('records fulfillment of the previous conditions and copies the marked ones to the renewed license', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'new-license' });
    const createCondition = jest
      .fn<Promise<{ id: string }>, [ConditionCreateInput]>()
      .mockImplementation(({ data }) =>
        Promise.resolve({ id: `copy-${data.position}` }),
      );
    const update = jest.fn().mockResolvedValue({ id: 'old-license' });
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'c-1',
        parentConditionId: null,
        name: 'Relatório',
        environmentalDescriptor: 'Resíduos',
        description: 'Descrição',
        responsibleAgency: 'FEPAM',
        responsibleName: 'Ana',
        conditionType: 'PERIODIC',
        periodicity: 'ANNUAL',
        hasDelivery: true,
      },
      {
        id: 'c-2',
        parentConditionId: null,
        name: 'Licença de operação',
      },
      {
        id: 'c-3',
        parentConditionId: null,
        name: 'Outorga',
        environmentalDescriptor: 'Recursos Hídricos',
        description: null,
        responsibleAgency: null,
        responsibleName: null,
        conditionType: null,
        periodicity: null,
        hasDelivery: false,
      },
    ]);
    const transaction = jest.fn((callback: (tx: unknown) => unknown) =>
      callback({
        license: { create, update },
        licenseCondition: {
          updateMany,
          findMany,
          create: createCondition,
        },
        licenseLegislation: { findMany: jest.fn().mockResolvedValue([]) },
      }),
    );
    const repository = new PrismaLicenseRepository(
      {
        $transaction: transaction,
      } as unknown as PrismaService,
      alertResolver,
    );
    const newDueDate = new Date('2027-10-01T00:00:00.000Z');
    const otherDueDate = new Date('2027-11-01T00:00:00.000Z');

    await repository.renew({
      ...RENEWAL,
      conditions: [
        // Decided out of order: the copies still follow the license's order.
        {
          conditionId: 'c-3',
          fulfilled: true,
          copyToNew: true,
          newDueDate: otherDueDate,
        },
        { conditionId: 'c-2', fulfilled: false, copyToNew: false },
        { conditionId: 'c-1', fulfilled: true, copyToNew: true, newDueDate },
      ],
    });

    expect(findMany).toHaveBeenCalledWith({
      where: { licenseId: 'old-license' },
      orderBy: CONDITION_ORDER,
    });
    // A condition already fulfilled is left alone, keeping its date.
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        licenseId: 'old-license',
        id: { in: ['c-3', 'c-1'] },
        OR: [
          { conditionStatus: { not: ConditionStatus.FULFILLED } },
          { completionDate: null },
        ],
      },
      data: {
        conditionStatus: ConditionStatus.FULFILLED,
        completionDate: expect.any(Date) as Date,
      },
    });
    // Only a fulfilled condition is reopened, and where it lands depends on
    // whether its due date has passed.
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        licenseId: 'old-license',
        id: { in: ['c-2'] },
        conditionStatus: ConditionStatus.FULFILLED,
        dueDate: { lt: expect.any(Date) as Date },
      },
      data: {
        conditionStatus: ConditionStatus.OVERDUE,
        completionDate: null,
      },
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        licenseId: 'old-license',
        id: { in: ['c-2'] },
        conditionStatus: ConditionStatus.FULFILLED,
        dueDate: { gte: expect.any(Date) as Date },
      },
      data: {
        conditionStatus: ConditionStatus.IN_PROGRESS,
        completionDate: null,
      },
    });
    expect(createCondition.mock.calls).toEqual([
      [
        {
          data: {
            licenseId: 'new-license',
            parentConditionId: null,
            name: 'Relatório',
            environmentalDescriptor: 'Resíduos',
            description: 'Descrição',
            responsibleAgency: 'FEPAM',
            responsibleName: 'Ana',
            conditionType: 'PERIODIC',
            periodicity: 'ANNUAL',
            hasDelivery: true,
            deadline: newDueDate,
            dueDate: newDueDate,
            position: 1,
          },
        },
      ],
      [
        {
          data: {
            licenseId: 'new-license',
            parentConditionId: null,
            name: 'Outorga',
            environmentalDescriptor: 'Recursos Hídricos',
            description: null,
            responsibleAgency: null,
            responsibleName: null,
            conditionType: null,
            periodicity: null,
            hasDelivery: false,
            deadline: otherDueDate,
            dueDate: otherDueDate,
            position: 2,
          },
        },
      ],
    ]);
  });

  it('does not copy any condition when none is marked to be copied', async () => {
    const createCondition = jest.fn();
    const transaction = jest.fn((callback: (tx: unknown) => unknown) =>
      callback({
        license: {
          create: jest.fn().mockResolvedValue({ id: 'new-license' }),
          update: jest.fn(),
        },
        licenseCondition: {
          findMany: jest.fn().mockResolvedValue([{ id: 'c-1' }]),
          updateMany: jest.fn(),
          create: createCondition,
        },
        licenseLegislation: { findMany: jest.fn().mockResolvedValue([]) },
      }),
    );
    const repository = new PrismaLicenseRepository(
      {
        $transaction: transaction,
      } as unknown as PrismaService,
      alertResolver,
    );

    await repository.renew({
      ...RENEWAL,
      conditions: [{ conditionId: 'c-1', fulfilled: true, copyToNew: false }],
    });

    expect(createCondition).not.toHaveBeenCalled();
  });

  it('copies selected sub-items with their copied parent', async () => {
    const createCondition = jest
      .fn<Promise<{ id: string }>, [ConditionCreateInput]>()
      .mockResolvedValueOnce({ id: 'new-parent' })
      .mockResolvedValueOnce({ id: 'new-child' });
    const transaction = jest.fn((callback: (tx: unknown) => unknown) =>
      callback({
        license: {
          create: jest.fn().mockResolvedValue({ id: 'new-license' }),
          update: jest.fn(),
        },
        licenseCondition: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'parent',
              parentConditionId: null,
              environmentalDescriptor: 'Resíduos',
              name: 'Relatório',
              hasDelivery: true,
            },
            {
              id: 'child',
              parentConditionId: 'parent',
              environmentalDescriptor: 'Resíduos',
              name: 'Anexo',
              hasDelivery: true,
            },
          ]),
          updateMany: jest.fn(),
          create: createCondition,
        },
        licenseLegislation: { findMany: jest.fn().mockResolvedValue([]) },
      }),
    );
    const repository = new PrismaLicenseRepository(
      {
        $transaction: transaction,
      } as unknown as PrismaService,
      alertResolver,
    );
    const newDueDate = new Date('2027-10-01T00:00:00.000Z');

    await repository.renew({
      ...RENEWAL,
      conditions: [
        {
          conditionId: 'parent',
          fulfilled: false,
          copyToNew: true,
          newDueDate,
        },
        {
          conditionId: 'child',
          fulfilled: false,
          copyToNew: true,
          newDueDate,
        },
      ],
    });

    expect(createCondition.mock.calls[0]?.[0].data).toMatchObject({
      name: 'Relatório',
      parentConditionId: null,
    });
    expect(createCondition.mock.calls[1]?.[0].data).toMatchObject({
      name: 'Anexo',
      parentConditionId: 'new-parent',
    });
  });

  it('rejects the renewal before writing anything when the conditions changed', async () => {
    const create = jest.fn();
    const updateMany = jest.fn();
    const transaction = jest.fn((callback: (tx: unknown) => unknown) =>
      callback({
        license: { create, update: jest.fn() },
        licenseCondition: {
          // c-2 was added after the caller loaded the list.
          findMany: jest.fn().mockResolvedValue([{ id: 'c-1' }, { id: 'c-2' }]),
          updateMany,
        },
      }),
    );
    const repository = new PrismaLicenseRepository(
      {
        $transaction: transaction,
      } as unknown as PrismaService,
      alertResolver,
    );

    await expect(
      repository.renew({
        ...RENEWAL,
        conditions: [{ conditionId: 'c-1', fulfilled: true, copyToNew: false }],
      }),
    ).rejects.toThrow(RenewalConditionsOutdatedError);
    expect(create).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('finds a license with its ordered conditions only when it belongs to the owner', async () => {
    const findFirst = jest.fn().mockResolvedValue({
      id: 'license-1',
      conditions: [
        { id: 'c-1', name: 'Relatório', conditionStatus: 'IN_PROGRESS' },
      ],
    });
    const repository = new PrismaLicenseRepository(
      {
        license: { findFirst },
      } as unknown as PrismaService,
      alertResolver,
    );

    await expect(
      repository.findByIdForOwnerWithConditions('license-1', 'owner-1'),
    ).resolves.toEqual({
      id: 'license-1',
      conditions: [expect.objectContaining({ id: 'c-1', title: 'Relatório' })],
    });
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'license-1', customer: { ownerUserId: 'owner-1' } },
      include: { conditions: { orderBy: CONDITION_ORDER } },
    });
  });

  it('returns null when the owner has no such license', async () => {
    const repository = new PrismaLicenseRepository(
      {
        license: { findFirst: jest.fn().mockResolvedValue(null) },
      } as unknown as PrismaService,
      alertResolver,
    );

    await expect(
      repository.findByIdForOwnerWithConditions('license-1', 'owner-1'),
    ).resolves.toBeNull();
  });

  it('finds all licenses for a customer ordered by soonest expiration first', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'license-1' }]);
    const repository = new PrismaLicenseRepository(
      {
        license: { findMany },
      } as unknown as PrismaService,
      alertResolver,
    );

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
    const repository = new PrismaLicenseRepository(
      {
        license: { findUnique },
      } as unknown as PrismaService,
      alertResolver,
    );

    await expect(repository.findById('license-1')).resolves.toEqual({
      id: 'license-1',
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'license-1' },
    });
  });

  it('finds a license by id only when it belongs to the authenticated owner', async () => {
    const findFirst = jest.fn().mockResolvedValue({ id: 'license-1' });
    const repository = new PrismaLicenseRepository(
      {
        license: { findFirst },
      } as unknown as PrismaService,
      alertResolver,
    );

    await expect(
      repository.findByIdForOwner('license-1', 'owner-1'),
    ).resolves.toEqual({ id: 'license-1' });
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'license-1', customer: { ownerUserId: 'owner-1' } },
    });
  });

  it('appends the created conditions after the existing ones, in order', async () => {
    const aggregate = jest.fn().mockResolvedValue({ _max: { position: 3 } });
    const createMany = jest.fn().mockResolvedValue({ count: 2 });
    const transaction = jest.fn((callback: (tx: unknown) => unknown) =>
      callback({ licenseCondition: { aggregate, createMany } }),
    );
    const repository = new PrismaLicenseRepository(
      {
        $transaction: transaction,
      } as unknown as PrismaService,
      alertResolver,
    );
    const condition = {
      licenseId: 'license-1',
      environmentalDescriptor: 'Resíduos',
      description: 'Relatório',
      responsibleName: 'Ana',
      conditionType: 'INFORMATIVE' as const,
      dueDate: new Date('2027-01-01T00:00:00.000Z'),
      conditionStatus: ConditionStatus.IN_PROGRESS,
      hasDelivery: true,
    };

    await expect(
      repository.createConditions([
        { ...condition, name: 'Primeira' },
        { ...condition, name: 'Segunda' },
      ]),
    ).resolves.toEqual({ count: 2 });
    expect(aggregate).toHaveBeenCalledWith({
      where: { licenseId: 'license-1' },
      _max: { position: true },
    });
    expect(createMany).toHaveBeenCalledWith({
      data: [
        { ...condition, name: 'Primeira', position: 4 },
        { ...condition, name: 'Segunda', position: 5 },
      ],
    });
  });

  it('creates nothing when there are no conditions', async () => {
    const createMany = jest.fn();
    const transaction = jest.fn((callback: (tx: unknown) => unknown) =>
      callback({ licenseCondition: { createMany } }),
    );
    const repository = new PrismaLicenseRepository(
      {
        $transaction: transaction,
      } as unknown as PrismaService,
      alertResolver,
    );

    await expect(repository.createConditions([])).resolves.toEqual({
      count: 0,
    });
    expect(createMany).not.toHaveBeenCalled();
  });

  it('finds a customer license and maps its conditions', async () => {
    const findFirst = jest.fn().mockResolvedValue({
      id: 'license-1',
      conditions: [{ name: 'MTR', conditionStatus: 'IN_PROGRESS' }],
    });
    const repository = new PrismaLicenseRepository(
      {
        license: { findFirst },
      } as unknown as PrismaService,
      alertResolver,
    );

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
        conditions: { orderBy: CONDITION_ORDER },
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
    const repository = new PrismaLicenseRepository(
      {
        license: { findMany },
      } as unknown as PrismaService,
      alertResolver,
    );

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
      include: { conditions: { orderBy: CONDITION_ORDER } },
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
    const repository = new PrismaLicenseRepository(
      {
        $transaction: transaction,
      } as unknown as PrismaService,
      alertResolver,
    );

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
    const repository = new PrismaLicenseRepository(
      {
        $transaction: transaction,
      } as unknown as PrismaService,
      alertResolver,
    );

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
    const repository = new PrismaLicenseRepository(
      {
        $transaction: transaction,
      } as unknown as PrismaService,
      alertResolver,
    );

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
          findFirst: jest
            .fn()
            .mockResolvedValueOnce({
              id: 'condition-1',
              licenseId: 'license-1',
              parentConditionId: null,
              environmentalDescriptor: 'Água',
            })
            .mockResolvedValueOnce(null),
          aggregate: jest.fn().mockResolvedValue({ _max: { position: 4 } }),
          update,
        },
      }),
    );
    const repository = new PrismaLicenseRepository(
      {
        $transaction: transaction,
      } as unknown as PrismaService,
      alertResolver,
    );

    await repository.updateCondition({
      id: 'condition-1',
      licenseId: 'license-1',
      customerId: 'customer-1',
      data: { environmentalDescriptor: 'Resíduos' },
    });

    expect(update.mock.calls[0]?.[0]).toMatchObject({
      where: { id: 'condition-1' },
      data: {
        environmentalDescriptor: 'Resíduos',
        position: 5,
      },
    });
  });

  it('updates a condition that belongs to the authenticated owner', async () => {
    const findFirst = jest
      .fn()
      .mockResolvedValueOnce({
        id: 'condition-1',
        licenseId: 'license-1',
        parentConditionId: null,
        environmentalDescriptor: 'Water',
      })
      .mockResolvedValueOnce(null);
    const update = jest.fn((updateArguments: unknown) => {
      void updateArguments;
      return Promise.resolve({
        name: 'Updated condition',
        conditionStatus: 'OVERDUE',
        environmentalDescriptor: 'Waste',
        isViolated: true,
      });
    });
    const aggregate = jest.fn().mockResolvedValue({ _max: { position: 0 } });
    const transaction = jest.fn((callback: (tx: unknown) => unknown) =>
      callback({ licenseCondition: { findFirst, aggregate, update } }),
    );
    const repository = new PrismaLicenseRepository(
      {
        $transaction: transaction,
      } as unknown as PrismaService,
      alertResolver,
    );

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
        position: 1,
      },
    });
    expect(aggregate).toHaveBeenCalledWith({
      where: { licenseId: 'license-1' },
      _max: { position: true },
    });
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
    const repository = new PrismaLicenseRepository(
      {
        $transaction: transaction,
      } as unknown as PrismaService,
      alertResolver,
    );

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
    const repository = new PrismaLicenseRepository(
      {
        $transaction: transaction,
      } as unknown as PrismaService,
      alertResolver,
    );

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
    const repository = new PrismaLicenseRepository(
      {
        $transaction: transaction,
      } as unknown as PrismaService,
      alertResolver,
    );

    await expect(
      repository.updateConditionForOwner('condition-1', 'owner-1', {}),
    ).rejects.toThrow(LicenseConditionNotFoundError);
    expect(update).not.toHaveBeenCalled();
  });

  describe('alert date validation on update', () => {
    const stored = {
      id: 'condition-1',
      licenseId: 'license-1',
      environmentalDescriptor: 'Resíduos sólidos',
      dueDate: new Date('2027-01-10T00:00:00.000Z'),
      alertDate: new Date('2027-01-01T00:00:00.000Z'),
    };

    function buildRepository() {
      const update = jest.fn().mockResolvedValue(stored);
      const transaction = jest.fn((callback: (tx: unknown) => unknown) =>
        callback({
          licenseCondition: {
            findFirst: jest.fn().mockResolvedValue(stored),
            update,
          },
        }),
      );
      const repository = new PrismaLicenseRepository(
        { $transaction: transaction } as unknown as PrismaService,
        alertResolver,
      );
      return { repository, update };
    }

    it('rejects an alert date after the stored due date', async () => {
      const { repository, update } = buildRepository();

      await expect(
        repository.updateConditionForOwner('condition-1', 'owner-1', {
          alertDate: new Date('2027-01-11T00:00:00.000Z'),
        }),
      ).rejects.toThrow(InvalidConditionAlertDateError);
      expect(update).not.toHaveBeenCalled();
    });

    it.each(['dueDate', 'deadline'] as const)(
      'rejects %s moved before the stored alert date',
      async (field) => {
        const { repository, update } = buildRepository();

        await expect(
          repository.updateCondition({
            id: 'condition-1',
            licenseId: 'license-1',
            customerId: 'customer-1',
            data: { [field]: new Date('2026-12-31T00:00:00.000Z') },
          }),
        ).rejects.toThrow(InvalidConditionAlertDateError);
        expect(update).not.toHaveBeenCalled();
      },
    );

    it('accepts moving both dates together and clearing the alert date', async () => {
      const { repository, update } = buildRepository();

      await repository.updateConditionForOwner('condition-1', 'owner-1', {
        dueDate: new Date('2026-12-31T00:00:00.000Z'),
        alertDate: new Date('2026-12-20T00:00:00.000Z'),
      });
      await repository.updateCondition({
        id: 'condition-1',
        licenseId: 'license-1',
        customerId: 'customer-1',
        data: {
          dueDate: new Date('2026-12-31T00:00:00.000Z'),
          alertDate: null,
        },
      });

      expect(update).toHaveBeenCalledTimes(2);
      expect(update).toHaveBeenLastCalledWith({
        where: { id: 'condition-1' },
        data: {
          dueDate: new Date('2026-12-31T00:00:00.000Z'),
          deadline: new Date('2026-12-31T00:00:00.000Z'),
          alertDate: null,
        },
      });
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
    const repository = new PrismaLicenseRepository(
      {
        $transaction: transaction,
      } as unknown as PrismaService,
      alertResolver,
    );

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
    const repository = new PrismaLicenseRepository(
      {
        $transaction: transaction,
      } as unknown as PrismaService,
      alertResolver,
    );

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
    const repository = new PrismaLicenseRepository(
      {
        license: { findFirst },
      } as unknown as PrismaService,
      alertResolver,
    );

    await expect(
      repository.findByIdForCustomer('missing-id', 'customer-1'),
    ).resolves.toBeNull();
  });

  it('saves conditions fulfillment without rewriting what is already recorded', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const transaction = jest.fn((callback: (tx: unknown) => unknown) =>
      callback({ licenseCondition: { updateMany } }),
    );
    const repository = new PrismaLicenseRepository(
      {
        $transaction: transaction,
      } as unknown as PrismaService,
      alertResolver,
    );

    await repository.saveConditionsFulfillment({
      licenseId: 'license-1',
      customerId: 'customer-1',
      items: [
        { conditionId: 'c-1', fulfilled: true },
        { conditionId: 'c-2', fulfilled: false },
      ],
    });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledTimes(3);
    expect(updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        licenseId: 'license-1',
        id: { in: ['c-1'] },
        OR: [
          { conditionStatus: { not: ConditionStatus.FULFILLED } },
          { completionDate: null },
        ],
      },
      data: {
        conditionStatus: ConditionStatus.FULFILLED,
        completionDate: expect.any(Date) as Date,
      },
    });
    // Reopening splits by due date: past it becomes OVERDUE, the rest
    // IN_PROGRESS.
    expect(updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        licenseId: 'license-1',
        id: { in: ['c-2'] },
        conditionStatus: ConditionStatus.FULFILLED,
        dueDate: { lt: expect.any(Date) as Date },
      },
      data: {
        conditionStatus: ConditionStatus.OVERDUE,
        completionDate: null,
      },
    });
    expect(updateMany).toHaveBeenNthCalledWith(3, {
      where: {
        licenseId: 'license-1',
        id: { in: ['c-2'] },
        conditionStatus: ConditionStatus.FULFILLED,
        dueDate: { gte: expect.any(Date) as Date },
      },
      data: {
        conditionStatus: ConditionStatus.IN_PROGRESS,
        completionDate: null,
      },
    });
    expect(alertResolver.resolveForConditions).toHaveBeenCalledWith(['c-1'], {
      licenseCondition: { updateMany },
    });
  });

  it('skips the reopen query when every condition was fulfilled', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const transaction = jest.fn((callback: (tx: unknown) => unknown) =>
      callback({ licenseCondition: { updateMany } }),
    );
    const repository = new PrismaLicenseRepository(
      {
        $transaction: transaction,
      } as unknown as PrismaService,
      alertResolver,
    );

    await repository.saveConditionsFulfillment({
      licenseId: 'license-1',
      customerId: 'customer-1',
      items: [{ conditionId: 'c-1', fulfilled: true }],
    });

    expect(updateMany).toHaveBeenCalledTimes(1);
  });

  describe('condition alerts on update', () => {
    const current = {
      id: 'condition-1',
      licenseId: 'license-1',
      dueDate: new Date('2026-11-10T00:00:00.000Z'),
      conditionStatus: ConditionStatus.IN_PROGRESS as ConditionStatus,
    };

    function repositoryWith(found: typeof current) {
      const client = {
        licenseCondition: {
          findFirst: jest.fn().mockResolvedValue(found),
          update: jest.fn().mockResolvedValue({ ...found, name: 'Cond' }),
        },
      };
      const repository = new PrismaLicenseRepository(
        {
          $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
            callback(client),
          ),
        } as unknown as PrismaService,
        alertResolver,
      );
      return { repository, client };
    }

    it('resolves the condition alerts when its due date changes', async () => {
      const { repository, client } = repositoryWith(current);

      await repository.updateCondition({
        id: 'condition-1',
        licenseId: 'license-1',
        customerId: 'customer-1',
        data: { dueDate: new Date('2026-12-10T00:00:00.000Z') },
      });

      expect(alertResolver.resolveForConditions).toHaveBeenCalledWith(
        ['condition-1'],
        client,
      );
    });

    it('resolves the condition alerts when an owner marks it fulfilled', async () => {
      const { repository, client } = repositoryWith(current);

      await repository.updateConditionForOwner('condition-1', 'owner-1', {
        status: ConditionStatus.FULFILLED,
      });

      expect(alertResolver.resolveForConditions).toHaveBeenCalledWith(
        ['condition-1'],
        client,
      );
    });

    it('keeps the alerts when neither the due date nor fulfillment changes', async () => {
      const { repository } = repositoryWith({
        ...current,
        conditionStatus: ConditionStatus.FULFILLED,
      });

      await repository.updateCondition({
        id: 'condition-1',
        licenseId: 'license-1',
        customerId: 'customer-1',
        data: {
          dueDate: new Date(current.dueDate),
          status: ConditionStatus.FULFILLED,
          title: 'Cond',
        },
      });
      await repository.updateConditionForOwner('condition-1', 'owner-1', {
        status: ConditionStatus.OVERDUE,
      });

      expect(alertResolver.resolveForConditions).not.toHaveBeenCalled();
    });
  });
});
