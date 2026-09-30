import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { LicenseRepository } from '../domain/licenses.repository';
import { DeleteLicenseConditionUseCase } from './delete-license-condition.use-case';

describe('DeleteLicenseConditionUseCase', () => {
  it('checks ownership and deletes the condition', async () => {
    const deleteCondition = jest.fn().mockResolvedValue(undefined);
    const useCase = new DeleteLicenseConditionUseCase(
      { deleteCondition } as unknown as LicenseRepository,
      {
        findOne: jest.fn().mockResolvedValue({ id: 'customer-1' }),
      } as unknown as CustomerRepository,
    );

    await expect(
      useCase.execute('customer-1', 'license-1', 'condition-1', 'owner-1'),
    ).resolves.toBeUndefined();
    expect(deleteCondition).toHaveBeenCalledWith(
      'condition-1',
      'license-1',
      'customer-1',
    );
  });

  it('rejects an unknown customer', async () => {
    const deleteCondition = jest.fn();
    const useCase = new DeleteLicenseConditionUseCase(
      { deleteCondition } as unknown as LicenseRepository,
      {
        findOne: jest.fn().mockResolvedValue(null),
      } as unknown as CustomerRepository,
    );

    await expect(
      useCase.execute('customer-1', 'license-1', 'condition-1', 'owner-1'),
    ).rejects.toThrow(CustomerNotFoundError);
    expect(deleteCondition).not.toHaveBeenCalled();
  });
});
