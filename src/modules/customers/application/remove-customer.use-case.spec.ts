import { CustomerRepository } from '../domain/customers.repository';
import { InMemoryCustomerRepository } from './__tests__/in-memory-customer.repository';
import { RemoveCustomerUseCase } from './remove-customer.use-case';

const OWNER = 'owner-1';
const OTHER_OWNER = 'owner-2';

describe('RemoveCustomerUseCase', () => {
  it('delegates the customer id to the repository', async () => {
    const remove = jest.fn().mockResolvedValue(true);
    const repository = {
      remove,
    } as unknown as CustomerRepository;
    const useCase = new RemoveCustomerUseCase(repository);

    await expect(useCase.removeCustomer('customer-1', OWNER)).resolves.toBe(
      true,
    );
    expect(remove).toHaveBeenCalledWith('customer-1', OWNER);
  });

  it('returns false when the repository does not find the customer', async () => {
    const remove = jest.fn().mockResolvedValue(false);
    const repository = {
      remove,
    } as unknown as CustomerRepository;
    const useCase = new RemoveCustomerUseCase(repository);

    await expect(useCase.removeCustomer('missing-id', OWNER)).resolves.toBe(
      false,
    );
  });

  // Deleting somebody else's company is refused as "not found" (the caller
  // answers 404), and the row is left untouched.
  it('refuses to delete a customer owned by another account', async () => {
    const repository = new InMemoryCustomerRepository();
    const foreign = repository.add({ ownerUserId: OTHER_OWNER });
    const useCase = new RemoveCustomerUseCase(repository);

    await expect(useCase.removeCustomer(foreign.id, OWNER)).resolves.toBe(
      false,
    );
    expect(foreign.isDeleted).toBe(false);

    await expect(useCase.removeCustomer(foreign.id, OTHER_OWNER)).resolves.toBe(
      true,
    );
    expect(foreign.isDeleted).toBe(true);
  });
});
