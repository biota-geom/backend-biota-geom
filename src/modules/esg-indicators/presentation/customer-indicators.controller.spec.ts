import { CreateCustomerIndicatorUseCase } from '../application/create-customer-indicator.use-case';
import { CustomerIndicatorsController } from './customer-indicators.controller';
import { CreateCustomerIndicatorDto } from './dto/create-customer-indicator.dto';

describe('CustomerIndicatorsController', () => {
  it('creates the indicator for the owner in the token and answers like a list item', async () => {
    const execute = jest.fn().mockResolvedValue({
      id: 'ind-9',
      name: 'Consumo de Combustível',
      unit: 'L',
      category: 'Ambiental',
    });
    const controller = new CustomerIndicatorsController({
      execute,
    } as unknown as CreateCustomerIndicatorUseCase);
    const dto = Object.assign(new CreateCustomerIndicatorDto(), {
      name: 'Consumo de Combustível',
      unit: 'L',
      category: 'Ambiental',
    });

    await expect(
      controller.create('customer-1', dto, { id: 'owner-1' }),
    ).resolves.toEqual({
      indicator_id: 'ind-9',
      name: 'Consumo de Combustível',
      unit: 'L',
      category: 'Ambiental',
      value: null,
    });

    expect(execute).toHaveBeenCalledWith({
      customerId: 'customer-1',
      ownerUserId: 'owner-1',
      name: 'Consumo de Combustível',
      unit: 'L',
      category: 'Ambiental',
    });
  });
});
