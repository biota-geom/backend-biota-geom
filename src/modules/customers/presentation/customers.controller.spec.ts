import { CustomersService } from '../infra/customers.service';
import { CustomerController } from './customers.controller';
import { UpdateCustomerDto } from './dto/update-customer.dto';

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

  it('delegates update to the customer service', async () => {
    const expected = { id: 'customer-1', name: 'Empresa Atualizada' };
    const service: Pick<CustomersService, 'update'> = {
      update: jest.fn().mockResolvedValue(expected),
    };
    const controller = new CustomerController(
      service as unknown as CustomersService,
    );
    const dto = Object.assign(new UpdateCustomerDto(), {
      name: 'Empresa Atualizada',
      esg_indicator_ids: [],
    });

    await expect(controller.updateCustomer('customer-1', dto)).resolves.toEqual(
      expected,
    );
    expect(service.update).toHaveBeenCalledWith('customer-1', dto);
  });

  it('delegates customer deletion to the service', async () => {
    const service: Pick<CustomersService, 'findAll' | 'remove'> = {
      findAll: jest.fn(),
      remove: jest.fn().mockResolvedValue(true),
    };
    const controller = new CustomerController(
      service as unknown as CustomersService,
    );

    await expect(
      controller.deleteCustomer('customer-1'),
    ).resolves.toBeUndefined();
    expect(service.remove).toHaveBeenCalledWith('customer-1');
  });
});
