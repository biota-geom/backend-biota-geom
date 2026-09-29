import { LicenseStatus, LicenseType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateLicenseData } from '../domain/create-license.data';
import { ATTENDED_LICENSE_CONDITION_STATUSES } from '../domain/license-conditions-summary';
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

  it('finds all licenses for a customer ordered by soonest expiration first, with their conditions summary', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'license-1',
        _count: { conditions: 8 },
        conditions: [{ id: 'condition-1' }, { id: 'condition-2' }],
      },
      { id: 'license-2', _count: { conditions: 0 }, conditions: [] },
    ]);
    const repository = new PrismaLicenseRepository({
      license: { findMany },
    } as unknown as PrismaService);

    await expect(repository.findAllByCustomerId('customer-1')).resolves.toEqual(
      [
        { id: 'license-1', conditionsSummary: { total: 8, attended: 2 } },
        { id: 'license-2', conditionsSummary: { total: 0, attended: 0 } },
      ],
    );
    expect(findMany).toHaveBeenCalledWith({
      where: { customerId: 'customer-1' },
      include: {
        issuingAgency: true,
        _count: { select: { conditions: true } },
        conditions: {
          where: { status: { in: ATTENDED_LICENSE_CONDITION_STATUSES } },
          select: { id: true },
        },
      },
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
});
