import {
  LicenseConditionStatus,
  LicenseStatus,
  LicenseType,
} from '@prisma/client';
import { CustomerRepository } from '../../customers/domain/customers.repository';
import { InvalidConditionDueDateError } from '../domain/errors/invalid-condition-due-date.error';
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

  return {
    useCase: new AddLicenseConditionsUseCase(
      licenseConditionRepository as LicenseConditionRepository,
      licenseRepository as LicenseRepository,
      customerRepository as CustomerRepository,
    ),
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
        environmentalDescriptor: 'Resíduos sólidos',
        responsibleAgency: 'FEPAM',
        dueDate: new Date('2027-05-20T00:00:00.000Z'),
        status,
        description: 'Manifesto de transporte.',
      },
    ],
  };
}

describe('AddLicenseConditionsUseCase', () => {
  it.each([undefined, new Date('invalid')])(
    'rejects a missing or invalid due date (%s)',
    async (dueDate) => {
      const { useCase, licenseRepository } = buildUseCase();
      const invalid = input();
      Object.assign(invalid.conditions[0], { dueDate });

      await expect(useCase.execute(invalid)).rejects.toThrow(
        InvalidConditionDueDateError,
      );
      expect(licenseRepository.findById).not.toHaveBeenCalled();
    },
  );

  it('validates every condition belongs to the route license', async () => {
    const { useCase } = buildUseCase();
    const invalid = input();
    invalid.conditions[0].licenseId = 'license-2';

    await expect(useCase.execute(invalid)).rejects.toThrow(
      LicenseConditionLicenseMismatchError,
    );
  });

  it('rejects an unknown or inaccessible license', async () => {
    const { useCase } = buildUseCase({
      customerRepository: { findOne: jest.fn().mockResolvedValue(null) },
    });

    await expect(useCase.execute(input())).rejects.toThrow(
      LicenseNotFoundError,
    );
  });

  it('persists free-text descriptors with the defaults', async () => {
    const { useCase, licenseConditionRepository } = buildUseCase();

    await useCase.execute(input());

    expect(licenseConditionRepository.addMany).toHaveBeenCalledWith([
      expect.objectContaining({
        environmentalDescriptor: 'Resíduos sólidos',
        hasDelivery: true,
        status: LicenseConditionStatus.REGULAR,
      }),
    ]);
  });

  it('preserves explicit status and delivery values', async () => {
    const { useCase, licenseConditionRepository } = buildUseCase();
    const custom = input(LicenseConditionStatus.ATTENTION);
    Object.assign(custom.conditions[0], { hasDelivery: false });

    await useCase.execute(custom);

    expect(licenseConditionRepository.addMany).toHaveBeenCalledWith([
      expect.objectContaining({
        hasDelivery: false,
        status: LicenseConditionStatus.ATTENTION,
      }),
    ]);
  });
});
