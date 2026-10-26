import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { EsgIndicatorRecordRepository } from '../domain/esg-indicator-records.repository';
import { InvalidReferenceMonthError } from '../domain/errors/invalid-reference-month.error';
import { SaveEsgIndicatorsUseCase } from './save-esg-indicators.use-case';

const SAVED = { WATER: 10, WASTE: null, EMPLOYEES: 3, ENERGY: null };

function buildUseCase(customer: unknown = { id: 'customer-1' }) {
  const saveMonth = jest.fn().mockResolvedValue(SAVED);
  const findOne = jest.fn().mockResolvedValue(customer);
  const useCase = new SaveEsgIndicatorsUseCase(
    { saveMonth } as unknown as EsgIndicatorRecordRepository,
    { findOne } as unknown as CustomerRepository,
  );

  return { useCase, saveMonth, findOne };
}

const input = {
  customerId: 'customer-1',
  ownerUserId: 'owner-1',
  month: '2026-09',
  changes: { WATER: 10, EMPLOYEES: 3 },
};

describe('SaveEsgIndicatorsUseCase', () => {
  it('saves the changes of the month and returns the stored values', async () => {
    const { useCase, saveMonth, findOne } = buildUseCase();

    await expect(useCase.execute(input)).resolves.toEqual(SAVED);

    expect(findOne).toHaveBeenCalledWith('customer-1', 'owner-1');
    expect(saveMonth).toHaveBeenCalledWith(
      'customer-1',
      new Date('2026-09-01T00:00:00.000Z'),
      input.changes,
    );
  });

  it('throws CustomerNotFoundError and saves nothing for a foreign customer', async () => {
    const { useCase, saveMonth } = buildUseCase(null);

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(
      CustomerNotFoundError,
    );
    expect(saveMonth).not.toHaveBeenCalled();
  });

  it('rejects an invalid month', async () => {
    const { useCase, saveMonth } = buildUseCase();

    await expect(
      useCase.execute({ ...input, month: '2026-9' }),
    ).rejects.toBeInstanceOf(InvalidReferenceMonthError);
    expect(saveMonth).not.toHaveBeenCalled();
  });
});
