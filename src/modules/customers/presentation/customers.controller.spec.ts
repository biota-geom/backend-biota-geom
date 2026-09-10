import { CustomersService } from '../infra/customers.service';
import { CustomerController } from './customers.controller';

describe('CustomerController', () => {
  it('returns the list from the customer service', async () => {
    const expected = [{ id: 'customer-1', name: 'Unidade Industrial RS' }];
    const findAll = jest.fn().mockResolvedValue(expected);
    const service = { findAll } as unknown as CustomersService;
    const controller = new CustomerController(service);

    await expect(controller.listCustomers()).resolves.toEqual(expected);
    expect(findAll).toHaveBeenCalledTimes(1);
  });

  it('delegates the detail lookup with the route id', async () => {
    const expected = { id: 'customer-1', name: 'Unidade Industrial RS' };
    const findOne = jest.fn().mockResolvedValue(expected);
    const service = { findOne } as unknown as CustomersService;
    const controller = new CustomerController(service);

    await expect(controller.getCustomer('customer-1')).resolves.toEqual(
      expected,
    );
    expect(findOne).toHaveBeenCalledWith('customer-1');
  });
});
