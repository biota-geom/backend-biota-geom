import { PrismaService } from '../../../prisma/prisma.service';
import { UpdateLicenseConditionData } from '../domain/update-license-condition.data';
import { PrismaLicenseConditionRepository } from './prisma-license-condition.repository';

function buildData(
  overrides: Partial<UpdateLicenseConditionData> = {},
): UpdateLicenseConditionData {
  return {
    licenseId: 'license-2',
    title: 'MTR - Manifesto de Transporte de Resíduos',
    description: 'Emissão de manifesto obrigatório.',
    category: 'Resíduos',
    dueDate: new Date('2026-06-30T00:00:00.000Z'),
    ...overrides,
  };
}

describe('PrismaLicenseConditionRepository', () => {
  it('finds all license conditions by customer through the license relation', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'condition-1' }]);
    const repository = new PrismaLicenseConditionRepository({
      licenseCondition: { findMany },
    } as unknown as PrismaService);

    await expect(repository.findAllByCustomerId('customer-1')).resolves.toEqual(
      [{ id: 'condition-1' }],
    );
    expect(findMany).toHaveBeenCalledWith({
      where: { license: { customerId: 'customer-1' } },
      orderBy: { dueDate: 'asc' },
    });
  });

  it('scopes the update to the owning customer and reads the persisted row back', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const findUnique = jest
      .fn()
      .mockResolvedValue({ id: 'condition-1', licenseId: 'license-2' });
    const repository = new PrismaLicenseConditionRepository({
      licenseCondition: { updateMany, findUnique },
    } as unknown as PrismaService);
    const data = buildData();

    await expect(
      repository.update('condition-1', 'customer-1', data),
    ).resolves.toEqual({ id: 'condition-1', licenseId: 'license-2' });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'condition-1', license: { customerId: 'customer-1' } },
      data: {
        licenseId: data.licenseId,
        title: data.title,
        description: data.description,
        category: data.category,
        dueDate: data.dueDate,
      },
    });
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'condition-1' } });
  });

  it('answers null — without reading anything back — when the update matched no row', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const findUnique = jest.fn();
    const repository = new PrismaLicenseConditionRepository({
      licenseCondition: { updateMany, findUnique },
    } as unknown as PrismaService);

    await expect(
      repository.update('condition-1', 'other-customer', buildData()),
    ).resolves.toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('scopes the delete to the owning customer', async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 1 });
    const repository = new PrismaLicenseConditionRepository({
      licenseCondition: { deleteMany },
    } as unknown as PrismaService);

    await expect(repository.remove('condition-1', 'customer-1')).resolves.toBe(
      true,
    );
    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: 'condition-1', license: { customerId: 'customer-1' } },
    });
  });

  it('answers false when the delete matched no row', async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 0 });
    const repository = new PrismaLicenseConditionRepository({
      licenseCondition: { deleteMany },
    } as unknown as PrismaService);

    await expect(
      repository.remove('condition-1', 'other-customer'),
    ).resolves.toBe(false);
  });
});
