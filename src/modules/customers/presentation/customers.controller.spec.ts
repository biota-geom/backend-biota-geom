import { CustomersService } from '../infra/customers.service';
import { CustomerController } from './customers.controller';

describe('CustomerController', () => {
  it('returns the list from the customer service', async () => {
    const expected = [{ id: 'customer-1', name: 'Unidade Industrial RS' }];
    const service: Pick<CustomersService, 'findAll'> = {
      findAll: jest.fn().mockResolvedValue(expected),
    };
    const controller = new CustomerController(
      service as unknown as CustomersService,
    );

    await expect(controller.listCustomers()).resolves.toEqual(expected);
    expect(service.findAll).toHaveBeenCalledTimes(1);
  });
});
