import { ConditionStatus, LicenseConditionStatus } from '@prisma/client';
import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { LicenseRepository } from '../domain/licenses.repository';
import { UpdateLicenseConditionUseCase } from './update-license-conditions.use-case';

describe('UpdateLicenseConditionUseCase', () => {
  const input = {
    customerId: 'customer-1',
    licenseId: 'license-1',
    conditionId: 'condition-1',
    ownerUserId: 'owner-1',
    data: { status: ConditionStatus.IN_PROGRESS },
  };

  it('updates an owned condition', async () => {
    const condition = {
      id: 'condition-1',
      status: LicenseConditionStatus.REGULAR,
    };
    const updateCondition = jest.fn().mockResolvedValue(condition);
    const useCase = new UpdateLicenseConditionUseCase(
      { updateCondition } as unknown as LicenseRepository,
      {
        findOne: jest.fn().mockResolvedValue({ id: 'customer-1' }),
      } as unknown as CustomerRepository,
    );

    await expect(useCase.execute(input)).resolves.toBe(condition);
    expect(updateCondition).toHaveBeenCalledWith({
      id: 'condition-1',
      licenseId: 'license-1',
      customerId: 'customer-1',
      data: input.data,
    });
  });

  it('rejects an unknown customer', async () => {
    const updateCondition = jest.fn();
    const useCase = new UpdateLicenseConditionUseCase(
      { updateCondition } as unknown as LicenseRepository,
      {
        findOne: jest.fn().mockResolvedValue(null),
      } as unknown as CustomerRepository,
    );

    await expect(useCase.execute(input)).rejects.toThrow(CustomerNotFoundError);
    expect(updateCondition).not.toHaveBeenCalled();
  });
});
