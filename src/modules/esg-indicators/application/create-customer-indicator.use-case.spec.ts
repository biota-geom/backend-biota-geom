import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { IndicatorAlreadyExistsError } from '../domain/errors/indicator-already-exists.error';
import { CreateCustomerIndicatorUseCase } from './create-customer-indicator.use-case';

const FUEL = {
  id: 'ind-9',
  name: 'Consumo de Combustível',
  unit: 'L',
  category: 'Ambiental' as const,
};
const INPUT = {
  customerId: 'customer-1',
  ownerUserId: 'owner-1',
  name: 'Consumo de Combustível',
  unit: 'L',
  category: 'Ambiental' as const,
};

function buildUseCase(
  options: {
    customer?: unknown;
    active?: unknown[];
    catalogEntry?: unknown;
  } = {},
) {
  const findActive = jest.fn().mockResolvedValue(options.active ?? []);
  const findInCatalogByName = jest
    .fn()
    .mockResolvedValue(options.catalogEntry ?? null);
  const link = jest.fn().mockResolvedValue(undefined);
  const createAndLink = jest.fn().mockResolvedValue(FUEL);
  const findOne = jest
    .fn()
    .mockResolvedValue(
      'customer' in options ? options.customer : { id: 'customer-1' },
    );
  const useCase = new CreateCustomerIndicatorUseCase(
    {
      findActive,
      findInCatalogByName,
      link,
      createAndLink,
    },
    { findOne } as unknown as CustomerRepository,
  );

  return { useCase, findActive, findInCatalogByName, link, createAndLink };
}

describe('CreateCustomerIndicatorUseCase', () => {
  it('creates the indicator and links it to the customer', async () => {
    const { useCase, createAndLink, link } = buildUseCase();

    await expect(useCase.execute(INPUT)).resolves.toEqual(FUEL);

    expect(createAndLink).toHaveBeenCalledWith('customer-1', 'owner-1', {
      name: 'Consumo de Combustível',
      unit: 'L',
      category: 'Ambiental',
    });
    expect(link).not.toHaveBeenCalled();
  });

  it('reuses a catalog entry with the same name instead of duplicating it', async () => {
    const { useCase, createAndLink, link } = buildUseCase({
      catalogEntry: FUEL,
    });

    await expect(useCase.execute(INPUT)).resolves.toEqual(FUEL);

    expect(link).toHaveBeenCalledWith('customer-1', 'ind-9');
    expect(createAndLink).not.toHaveBeenCalled();
  });

  it('refuses a name the customer already has, ignoring case and spaces', async () => {
    const { useCase, createAndLink, link } = buildUseCase({
      active: [{ ...FUEL, name: 'CONSUMO DE COMBUSTÍVEL ' }],
    });

    await expect(useCase.execute(INPUT)).rejects.toBeInstanceOf(
      IndicatorAlreadyExistsError,
    );
    expect(createAndLink).not.toHaveBeenCalled();
    expect(link).not.toHaveBeenCalled();
  });

  it('throws CustomerNotFoundError when the customer is not the owner’s', async () => {
    const { useCase, findActive } = buildUseCase({ customer: null });

    await expect(useCase.execute(INPUT)).rejects.toBeInstanceOf(
      CustomerNotFoundError,
    );
    expect(findActive).not.toHaveBeenCalled();
  });
});
