import { ConditionType } from '@prisma/client';
import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { LicenseRepository } from '../domain/licenses.repository';
import { CreateLicenseConditionUseCase } from './create-license-conditions.use-case';

function buildUseCase(overrides?: {
  customerRepository?: Partial<CustomerRepository>;
  repository?: Partial<LicenseRepository>;
}) {
  const customerRepository: Partial<CustomerRepository> = {
    findOne: jest.fn().mockResolvedValue({ id: 'customer-1' }),
    ...overrides?.customerRepository,
  };
  const repository: Partial<LicenseRepository> = {
    createConditions: jest.fn().mockResolvedValue({ count: 2 }),
    ...overrides?.repository,
  };

  return {
    useCase: new CreateLicenseConditionUseCase(
      repository as LicenseRepository,
      customerRepository as CustomerRepository,
    ),
    customerRepository,
    repository,
  };
}

const input = {
  customerId: 'customer-1',
  licenseId: 'license-1',
  userId: 'owner-1',
  data: {
    conditions: [
      {
        category_id: 'category-1',
        item_number: '1.1',
        description: 'Relatório',
        responsible_name: 'Ana',
        condition_type: ConditionType.INFORMATIVE,
        periodicity: 'MONTHLY',
        deadline: '2027-01-01T00:00:00.000Z',
      },
    ],
  },
};

describe('CreateLicenseConditionUseCase', () => {
  it('creates conditions after validating customer ownership', async () => {
    const { useCase, repository } = buildUseCase();

    await expect(useCase.execute(input)).resolves.toEqual({
      count: 2,
      message: 'Condicionantes vinculadas com sucesso',
    });
    expect(repository.createConditions).toHaveBeenCalledWith([
      expect.objectContaining({
        licenseId: 'license-1',
        itemNumber: '1.1',
        conditionType: ConditionType.INFORMATIVE,
      }),
    ]);
  });

  it('rejects an unknown customer', async () => {
    const { useCase, repository } = buildUseCase({
      customerRepository: { findOne: jest.fn().mockResolvedValue(null) },
    });

    await expect(useCase.execute(input)).rejects.toThrow(CustomerNotFoundError);
    expect(repository.createConditions).not.toHaveBeenCalled();
  });
});
