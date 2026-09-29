import {
  LicenseConditionStatus,
  LicenseStatus,
  LicenseType,
} from '@prisma/client';
import { CustomerRepository } from '../../customers/domain/customers.repository';
import { LicenseConditionLicenseMismatchError } from '../domain/errors/license-condition-license-mismatch.error';
import { LicenseNotFoundError } from '../domain/errors/license-not-found.error';
import { LicenseConditionRepository } from '../domain/license-conditions.repository';
import { LicenseRepository } from '../domain/licenses.repository';
import { AddLicenseConditionsUseCase } from './add-license-conditions.use-case';

function buildUseCase(overrides?: {
  customerRepository?: Partial<CustomerRepository>;
  licenseConditionRepository?: Partial<LicenseConditionRepository>;
  licenseRepository?: Partial<LicenseRepository>;
}) {
  const licenseConditionRepository: Partial<LicenseConditionRepository> = {
    addMany: jest.fn().mockResolvedValue([]),
    ...overrides?.licenseConditionRepository,
  };
  const licenseRepository: Partial<LicenseRepository> = {
    findById: jest.fn().mockResolvedValue({
      id: 'license-1',
      customerId: 'customer-1',
      type: LicenseType.LO,
      processNumber: 'LO 118/2020',
      issuingAgencyId: 'agency-1',
      issueDate: new Date('2020-01-01T00:00:00.000Z'),
      expirationDate: new Date('2028-01-01T00:00:00.000Z'),
      status: LicenseStatus.REGULAR,
      documentUrl: 'https://example.com/license.pdf',
      createdAt: new Date('2020-01-01T00:00:00.000Z'),
      updatedAt: new Date('2020-01-01T00:00:00.000Z'),
    }),
    ...overrides?.licenseRepository,
  };
  const customerRepository: Partial<CustomerRepository> = {
    findOne: jest.fn().mockResolvedValue({ id: 'customer-1' }),
    ...overrides?.customerRepository,
  };

  const useCase = new AddLicenseConditionsUseCase(
    licenseConditionRepository as LicenseConditionRepository,
    licenseRepository as LicenseRepository,
    customerRepository as CustomerRepository,
  );

  return {
    useCase,
    customerRepository,
    licenseConditionRepository,
    licenseRepository,
  };
}

function input(status?: LicenseConditionStatus) {
  return {
    licenseId: 'license-1',
    ownerUserId: 'owner-1',
    conditions: [
      {
        licenseId: 'license-1',
        name: 'MTR',
        category: 'Resíduos',
        responsibleAgency: 'FEPAM',
        dueDate: new Date('2027-05-20T00:00:00.000Z'),
        status,
        description: 'Manifesto de transporte.',
      },
    ],
  };
}

describe('AddLicenseConditionsUseCase', () => {
  it('validates every condition belongs to the route license before querying', async () => {
    const { useCase, licenseRepository } = buildUseCase();
    const invalid = input();
    invalid.conditions[0].licenseId = 'license-2';

    await expect(useCase.execute(invalid)).rejects.toThrow(
      LicenseConditionLicenseMismatchError,
    );
    expect(licenseRepository.findById).not.toHaveBeenCalled();
  });

  it('rejects an unknown license', async () => {
    const { useCase, customerRepository } = buildUseCase({
      licenseRepository: { findById: jest.fn().mockResolvedValue(null) },
    });

    await expect(useCase.execute(input())).rejects.toThrow(
      LicenseNotFoundError,
    );
    expect(customerRepository.findOne).not.toHaveBeenCalled();
  });

  it('rejects a license whose customer is not owned by the authenticated user', async () => {
    const { useCase, customerRepository, licenseConditionRepository } =
      buildUseCase({
        customerRepository: { findOne: jest.fn().mockResolvedValue(null) },
      });

    await expect(useCase.execute(input())).rejects.toThrow(
      LicenseNotFoundError,
    );
    expect(customerRepository.findOne).toHaveBeenCalledWith(
      'customer-1',
      'owner-1',
    );
    expect(licenseConditionRepository.addMany).not.toHaveBeenCalled();
  });

  it('uses Regular by default and persists the batch after validating ownership', async () => {
    const { useCase, licenseConditionRepository } = buildUseCase();

    await useCase.execute(input());

    expect(licenseConditionRepository.addMany).toHaveBeenCalledWith([
      expect.objectContaining({ status: LicenseConditionStatus.REGULAR }),
    ]);
  });

  it('preserves an explicitly selected initial status', async () => {
    const { useCase, licenseConditionRepository } = buildUseCase();

    await useCase.execute(input(LicenseConditionStatus.ATTENTION));

    expect(licenseConditionRepository.addMany).toHaveBeenCalledWith([
      expect.objectContaining({ status: LicenseConditionStatus.ATTENTION }),
    ]);
  });
});
