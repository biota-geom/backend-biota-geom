import { CustomerRepository } from '../domain/customers.repository';
import { RemoveCustomerUseCase } from './remove-customer.use-case';

describe('RemoveCustomerUseCase', () => {
  it('delegates the customer id to the repository', async () => {
    const remove = jest.fn().mockResolvedValue(true);
    const repository = {
      remove,
    } as unknown as CustomerRepository;
    const useCase = new RemoveCustomerUseCase(repository);

    await expect(useCase.removeCustomer('customer-1')).resolves.toBe(true);
    expect(remove).toHaveBeenCalledWith('customer-1');
  });
});
