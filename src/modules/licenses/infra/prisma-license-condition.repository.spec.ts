import { LicenseConditionStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { PrismaLicenseConditionRepository } from './prisma-license-condition.repository';

const ROW = {
  id: 'condition-1',
  licenseId: 'license-1',
  name: 'MTR',
  description: null,
  esgMetricId: 'metric-1',
  esgMetric: { id: 'metric-1', name: 'Resíduos' },
  responsibleAgency: 'FEPAM',
  dueDate: new Date('2027-05-20T00:00:00.000Z'),
  status: LicenseConditionStatus.REGULAR,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
};

const DOMAIN = {
  id: 'condition-1',
  licenseId: 'license-1',
  name: 'MTR',
  description: null,
  category: { id: 'metric-1', name: 'Resíduos' },
  responsibleAgency: 'FEPAM',
  dueDate: new Date('2027-05-20T00:00:00.000Z'),
  status: LicenseConditionStatus.REGULAR,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
};

const WITH_CATEGORY = { esgMetric: { select: { id: true, name: true } } };

describe('PrismaLicenseConditionRepository', () => {
  it('creates all conditions in one transaction and resolves their GRI category', async () => {
    const create = jest.fn().mockReturnValue({ operation: 'create' });
    const transaction = jest.fn().mockResolvedValue([ROW]);
    const repository = new PrismaLicenseConditionRepository({
      licenseCondition: { create },
      $transaction: transaction,
    } as unknown as PrismaService);
    const conditions = [
      {
        licenseId: 'license-1',
        name: 'MTR',
        esgMetricId: 'metric-1',
        responsibleAgency: 'FEPAM',
        dueDate: new Date('2027-05-20T00:00:00.000Z'),
        status: LicenseConditionStatus.REGULAR,
      },
    ];

    await expect(repository.addMany(conditions)).resolves.toEqual([DOMAIN]);
    expect(create).toHaveBeenCalledWith({
      data: conditions[0],
      include: WITH_CATEGORY,
    });
    expect(transaction).toHaveBeenCalledWith([{ operation: 'create' }]);
  });

  it('finds all license conditions by customer through the license relation', async () => {
    const findMany = jest.fn().mockResolvedValue([ROW]);
    const repository = new PrismaLicenseConditionRepository({
      licenseCondition: { findMany },
    } as unknown as PrismaService);

    await expect(repository.findAllByCustomerId('customer-1')).resolves.toEqual(
      [DOMAIN],
    );
    expect(findMany).toHaveBeenCalledWith({
      where: { license: { customerId: 'customer-1' } },
      include: WITH_CATEGORY,
      orderBy: { dueDate: 'asc' },
    });
  });
});
