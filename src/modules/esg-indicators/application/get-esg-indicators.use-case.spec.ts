import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { CustomerIndicatorRepository } from '../domain/customer-indicators.repository';
import { EsgIndicatorRecordRepository } from '../domain/esg-indicator-records.repository';
import { InvalidReferenceMonthError } from '../domain/errors/invalid-reference-month.error';
import { GetEsgIndicatorsUseCase } from './get-esg-indicators.use-case';

const WATER = {
  id: 'ind-1',
  name: 'Consumo de Água',
  unit: 'm³',
  category: 'Ambiental' as const,
};
const WASTE = {
  id: 'ind-2',
  name: 'Resíduos Totais',
  unit: 't',
  category: 'Ambiental' as const,
};

function buildUseCase(customer: unknown = { id: 'customer-1' }) {
  const findValuesByMonth = jest
    .fn()
    .mockResolvedValue(new Map([['ind-1', 1250.5]]));
  const findActive = jest.fn().mockResolvedValue([WATER, WASTE]);
  const findOne = jest.fn().mockResolvedValue(customer);
  const useCase = new GetEsgIndicatorsUseCase(
    { findValuesByMonth } as unknown as EsgIndicatorRecordRepository,
    { findActive } as unknown as CustomerIndicatorRepository,
    { findOne } as unknown as CustomerRepository,
  );

  return { useCase, findValuesByMonth, findActive, findOne };
}

describe('GetEsgIndicatorsUseCase', () => {
  it('lists every indicator of the customer with the value of the month', async () => {
    const { useCase, findValuesByMonth, findActive, findOne } = buildUseCase();

    await expect(
      useCase.execute('customer-1', 'owner-1', '2026-09'),
    ).resolves.toEqual([
      { ...WATER, value: 1250.5 },
      { ...WASTE, value: null },
    ]);

    expect(findOne).toHaveBeenCalledWith('customer-1', 'owner-1');
    expect(findActive).toHaveBeenCalledWith('customer-1');
    expect(findValuesByMonth).toHaveBeenCalledWith(
      'customer-1',
      new Date('2026-09-01T00:00:00.000Z'),
    );
  });

  it('throws CustomerNotFoundError when the customer is not the owner’s', async () => {
    const { useCase, findActive, findValuesByMonth } = buildUseCase(null);

    await expect(
      useCase.execute('customer-1', 'owner-1', '2026-09'),
    ).rejects.toBeInstanceOf(CustomerNotFoundError);
    expect(findActive).not.toHaveBeenCalled();
    expect(findValuesByMonth).not.toHaveBeenCalled();
  });

  it('rejects an invalid month before touching the database', async () => {
    const { useCase, findOne } = buildUseCase();

    await expect(
      useCase.execute('customer-1', 'owner-1', '2026-13'),
    ).rejects.toBeInstanceOf(InvalidReferenceMonthError);
    expect(findOne).not.toHaveBeenCalled();
  });
});
