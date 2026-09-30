import { LicenseStatus, LicenseType } from '@prisma/client';
import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { License } from '../domain/license.entity';
import { LicenseRepository } from '../domain/licenses.repository';
import { ListLicensesByCustomerUseCase } from './list-licenses-by-customer.use-case';

function buildUseCase(overrides?: {
  customerRepository?: Partial<CustomerRepository>;
  licenseRepository?: Partial<LicenseRepository>;
}) {
  const customerRepository: Partial<CustomerRepository> = {
    findOne: jest.fn().mockResolvedValue({ id: 'customer-1' }),
    ...overrides?.customerRepository,
  };
  const licenseRepository: Partial<LicenseRepository> = {
    findAllByCustomerId: jest.fn().mockResolvedValue([]),
    ...overrides?.licenseRepository,
  };

  const useCase = new ListLicensesByCustomerUseCase(
    licenseRepository as LicenseRepository,
    customerRepository as CustomerRepository,
  );

  return { useCase, customerRepository, licenseRepository };
}

function buildLicense(overrides: Partial<License>): License {
  return {
    id: 'license-1',
    customerId: 'customer-1',
    type: LicenseType.LO,
    processNumber: 'LO nº 118/2020',
    issuingAgencyId: 'agency-1',
    issueDate: new Date('2020-01-10T00:00:00.000Z'),
    expirationDate: new Date('2099-01-10T00:00:00.000Z'),
    status: LicenseStatus.REGULAR,
    documentUrl: 'https://storage.example.com/license.pdf',
    createdAt: new Date('2020-01-10T00:00:00.000Z'),
    updatedAt: new Date('2020-01-10T00:00:00.000Z'),
    ...overrides,
  };
}

describe('ListLicensesByCustomerUseCase', () => {
  it('throws CustomerNotFoundError when the customer is missing or not owned', async () => {
    const { useCase, customerRepository } = buildUseCase({
      customerRepository: { findOne: jest.fn().mockResolvedValue(null) },
    });

    await expect(useCase.execute('customer-1', 'owner-1')).rejects.toThrow(
      CustomerNotFoundError,
    );
    expect(customerRepository.findOne).toHaveBeenCalledWith(
      'customer-1',
      'owner-1',
    );
  });

  it('never queries licenses for a customer that is not found', async () => {
    const { useCase, licenseRepository } = buildUseCase({
      customerRepository: { findOne: jest.fn().mockResolvedValue(null) },
    });

    await expect(useCase.execute('customer-1', 'owner-1')).rejects.toThrow();
    expect(licenseRepository.findAllByCustomerId).not.toHaveBeenCalled();
  });

  it('returns a zeroed summary when the customer has no licenses', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute('customer-1', 'owner-1');

    expect(result).toEqual({
      summary: { total: 0, regular: 0, attention: 0, expired: 0 },
      licenses: [],
    });
  });

  it('classifies each license live from its expirationDate and derives total from the counted statuses', async () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);

    const { useCase } = buildUseCase({
      licenseRepository: {
        findAllByCustomerId: jest.fn().mockResolvedValue([
          buildLicense({
            id: 'license-regular',
            expirationDate: new Date('2027-01-01T00:00:00.000Z'),
            status: LicenseStatus.EXPIRED, // stale stored status, must be ignored
          }),
          buildLicense({
            id: 'license-attention',
            expirationDate: new Date('2026-01-16T00:00:00.000Z'),
            status: LicenseStatus.REGULAR, // stale stored status, must be ignored
          }),
          buildLicense({
            id: 'license-expired',
            expirationDate: new Date('2025-12-31T00:00:00.000Z'),
            status: LicenseStatus.REGULAR, // stale stored status, must be ignored
          }),
        ]),
      },
    });

    const result = await useCase.execute('customer-1', 'owner-1');

    expect(result.summary).toEqual({
      total: 3,
      regular: 1,
      attention: 1,
      expired: 1,
    });
    expect(
      result.summary.regular +
        result.summary.attention +
        result.summary.expired,
    ).toBe(result.summary.total);
    expect(result.licenses.map((l) => l.status)).toEqual([
      LicenseStatus.REGULAR,
      LicenseStatus.ATTENTION,
      LicenseStatus.EXPIRED,
    ]);

    jest.useRealTimers();
  });
});
