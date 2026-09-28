import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { LicenseConditionNotFoundError } from '../domain/errors/license-condition-not-found.error';
import { LicenseConditionRepository } from '../domain/license-conditions.repository';
import { DeleteLicenseConditionUseCase } from './delete-license-condition.use-case';

function buildUseCase(overrides?: {
  customerRepository?: Partial<CustomerRepository>;
  licenseConditionRepository?: Partial<LicenseConditionRepository>;
}) {
  const customerRepository: Partial<CustomerRepository> = {
    findOne: jest.fn().mockResolvedValue({ id: 'customer-1' }),
    ...overrides?.customerRepository,
  };
  const licenseConditionRepository: Partial<LicenseConditionRepository> = {
    remove: jest.fn().mockResolvedValue(true),
    ...overrides?.licenseConditionRepository,
  };

  const useCase = new DeleteLicenseConditionUseCase(
    licenseConditionRepository as LicenseConditionRepository,
    customerRepository as CustomerRepository,
  );

  return { useCase, customerRepository, licenseConditionRepository };
}

describe('DeleteLicenseConditionUseCase', () => {
  it('throws CustomerNotFoundError when the customer is missing or not owned', async () => {
    const { useCase, customerRepository } = buildUseCase({
      customerRepository: { findOne: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      useCase.execute('condition-1', 'customer-1', 'owner-1'),
    ).rejects.toThrow(CustomerNotFoundError);
    expect(customerRepository.findOne).toHaveBeenCalledWith(
      'customer-1',
      'owner-1',
    );
  });

  it('never deletes when the customer is not found', async () => {
    const { useCase, licenseConditionRepository } = buildUseCase({
      customerRepository: { findOne: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      useCase.execute('condition-1', 'customer-1', 'owner-1'),
    ).rejects.toThrow();
    expect(licenseConditionRepository.remove).not.toHaveBeenCalled();
  });

  it('throws LicenseConditionNotFoundError when no row matches the customer', async () => {
    const { useCase } = buildUseCase({
      licenseConditionRepository: {
        remove: jest.fn().mockResolvedValue(false),
      },
    });

    await expect(
      useCase.execute('condition-1', 'customer-1', 'owner-1'),
    ).rejects.toThrow(LicenseConditionNotFoundError);
  });

  it('scopes the delete to the owning customer', async () => {
    const { useCase, licenseConditionRepository } = buildUseCase();

    await expect(
      useCase.execute('condition-1', 'customer-1', 'owner-1'),
    ).resolves.toBeUndefined();
    expect(licenseConditionRepository.remove).toHaveBeenCalledWith(
      'condition-1',
      'customer-1',
    );
  });
});
