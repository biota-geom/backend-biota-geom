import { LicenseConditionStatus, LicenseStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { PrismaLicenseConditionRepository } from './prisma-license-condition.repository';

const ROW = {
  id: 'condition-1',
  licenseId: 'license-1',
  name: 'MTR',
  environmentalDescriptor: 'Resíduos sólidos',
  description: null,
  responsibleAgency: 'FEPAM',
  dueDate: new Date('2027-05-20T00:00:00.000Z'),
  status: LicenseConditionStatus.REGULAR,
  hasDelivery: true,
  isViolated: false,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
};

describe('PrismaLicenseConditionRepository', () => {
  it('appends all conditions after the existing ones in one transaction', async () => {
    const aggregate = jest.fn().mockResolvedValue({ _max: { position: 2 } });
    const createManyAndReturn = jest.fn().mockResolvedValue([ROW]);
    const transaction = jest.fn((callback: (tx: unknown) => unknown) =>
      callback({ licenseCondition: { aggregate, createManyAndReturn } }),
    );
    const repository = new PrismaLicenseConditionRepository({
      $transaction: transaction,
    } as unknown as PrismaService);
    const conditions = [
      {
        licenseId: 'license-1',
        name: 'MTR',
        environmentalDescriptor: 'Resíduos sólidos',
        responsibleAgency: 'FEPAM',
        dueDate: ROW.dueDate,
        status: LicenseConditionStatus.REGULAR,
        hasDelivery: true,
      },
    ];

    await expect(repository.addMany(conditions)).resolves.toEqual([ROW]);
    expect(aggregate).toHaveBeenCalledWith({
      where: { licenseId: 'license-1' },
      _max: { position: true },
    });
    expect(createManyAndReturn).toHaveBeenCalledWith({
      data: [{ ...conditions[0], position: 3 }],
    });
  });

  it('finds active-license conditions by customer', async () => {
    const findMany = jest.fn().mockResolvedValue([ROW]);
    const repository = new PrismaLicenseConditionRepository({
      licenseCondition: { findMany },
    } as unknown as PrismaService);

    await expect(repository.findAllByCustomerId('customer-1')).resolves.toEqual(
      [ROW],
    );
    expect(findMany).toHaveBeenCalledWith({
      where: {
        license: {
          customerId: 'customer-1',
          status: { not: LicenseStatus.ARCHIVED },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  });
});
