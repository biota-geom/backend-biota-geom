import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { IndicatorAlreadyExistsError } from '../domain/errors/indicator-already-exists.error';
import { PrismaCustomerIndicatorRepository } from './prisma-customer-indicator.repository';

const METRIC = {
  id: 'ind-1',
  name: 'Consumo de Água',
  unit: 'm³',
  pillar: 'AMBIENTAL',
  customerId: null,
};
const DEFINITION = {
  id: 'ind-1',
  name: 'Consumo de Água',
  unit: 'm³',
  category: 'Ambiental',
};

function buildRepository() {
  const findMany = jest.fn();
  const findFirst = jest.fn();
  const create = jest.fn();
  const createMany = jest.fn().mockResolvedValue({ count: 1 });
  const linkCreate = jest.fn().mockResolvedValue(undefined);
  const tx = {
    esgMetric: { create },
    customerEsgMetric: { create: linkCreate },
  };
  const $transaction = jest.fn((callback: (client: typeof tx) => unknown) =>
    callback(tx),
  );
  const repository = new PrismaCustomerIndicatorRepository({
    esgMetric: { findMany, findFirst },
    customerEsgMetric: { createMany },
    $transaction,
  } as unknown as PrismaService);

  return {
    repository,
    findMany,
    findFirst,
    create,
    createMany,
    linkCreate,
    $transaction,
  };
}

describe('PrismaCustomerIndicatorRepository', () => {
  it('lists the indicators linked to the customer as definitions', async () => {
    const { repository, findMany } = buildRepository();
    findMany.mockResolvedValue([METRIC]);

    await expect(repository.findActive('customer-1')).resolves.toEqual([
      DEFINITION,
    ]);
    expect(findMany).toHaveBeenCalledWith({
      where: { customerLinks: { some: { customerId: 'customer-1' } } },
      orderBy: [{ pillar: 'asc' }, { name: 'asc' }],
    });
  });

  it('finds a global or own catalog entry by name, ignoring case', async () => {
    const { repository, findFirst } = buildRepository();
    findFirst.mockResolvedValue(METRIC);

    await expect(
      repository.findInCatalogByName('owner-1', 'consumo de água'),
    ).resolves.toEqual(DEFINITION);
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        name: { equals: 'consumo de água', mode: 'insensitive' },
        OR: [{ customerId: null }, { customerId: 'owner-1' }],
      },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('returns null when the catalog has no entry with that name', async () => {
    const { repository, findFirst } = buildRepository();
    findFirst.mockResolvedValue(null);

    await expect(
      repository.findInCatalogByName('owner-1', 'x'),
    ).resolves.toBeNull();
  });

  it('links an existing entry without failing on a repeated link', async () => {
    const { repository, createMany } = buildRepository();

    await repository.link('customer-1', 'ind-1');

    expect(createMany).toHaveBeenCalledWith({
      data: [{ customerId: 'customer-1', esgMetricId: 'ind-1' }],
      skipDuplicates: true,
    });
  });

  it('creates the entry owned by the account and links it in one transaction', async () => {
    const { repository, create, linkCreate, $transaction } = buildRepository();
    create.mockResolvedValue({ ...METRIC, customerId: 'owner-1' });

    await expect(
      repository.createAndLink('customer-1', 'owner-1', {
        name: 'Consumo de Água',
        unit: 'm³',
        category: 'Ambiental',
      }),
    ).resolves.toEqual(DEFINITION);

    expect($transaction).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      data: {
        name: 'Consumo de Água',
        unit: 'm³',
        pillar: 'AMBIENTAL',
        customerId: 'owner-1',
      },
    });
    expect(linkCreate).toHaveBeenCalledWith({
      data: { customerId: 'customer-1', esgMetricId: 'ind-1' },
    });
  });

  it('turns a unique violation into IndicatorAlreadyExistsError', async () => {
    const { repository, $transaction } = buildRepository();
    $transaction.mockImplementation(() =>
      Promise.reject(
        new Prisma.PrismaClientKnownRequestError('duplicate', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      ),
    );

    await expect(
      repository.createAndLink('customer-1', 'owner-1', {
        name: 'X',
        unit: 'u',
        category: 'Social',
      }),
    ).rejects.toBeInstanceOf(IndicatorAlreadyExistsError);
  });

  it('lets any other error through', async () => {
    const { repository, $transaction } = buildRepository();
    $transaction.mockImplementation(() => Promise.reject(new Error('db down')));

    await expect(
      repository.createAndLink('customer-1', 'owner-1', {
        name: 'X',
        unit: 'u',
        category: 'Social',
      }),
    ).rejects.toThrow('db down');
  });
});
