import { ListCustomersUseCase } from '../application/list-customers.use-case';
import { CustomersService } from './customers.service';

describe('CustomersService', () => {
  it('delegates the list operation to the use case', async () => {
    const result = [{ id: 'customer-1', name: 'Unidade Industrial RS' }];
    const listCustomersUseCase: Pick<ListCustomersUseCase, 'listCustomers'> = {
      listCustomers: jest.fn().mockResolvedValue(result),
    };
    const service = new CustomersService(
      listCustomersUseCase as unknown as ListCustomersUseCase,
    );

    await expect(service.findAll()).resolves.toEqual(result);
    expect(listCustomersUseCase.listCustomers).toHaveBeenCalledTimes(1);
  });
});
