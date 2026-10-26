import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { EsgIndicatorValues } from '../domain/esg-indicator';
import { EsgIndicatorRecordRepository } from '../domain/esg-indicator-records.repository';
import { InvalidReferenceMonthError } from '../domain/errors/invalid-reference-month.error';
import { GetEsgIndicatorsUseCase } from './get-esg-indicators.use-case';

const VALUES: EsgIndicatorValues = {
  WATER: 1250.5,
  WASTE: null,
  EMPLOYEES: 148,
  ENERGY: null,
};

function buildUseCase(customer: unknown = { id: 'customer-1' }) {
  const findByMonth = jest.fn().mockResolvedValue(VALUES);
  const findOne = jest.fn().mockResolvedValue(customer);
  const useCase = new GetEsgIndicatorsUseCase(
    { findByMonth } as unknown as EsgIndicatorRecordRepository,
    { findOne } as unknown as CustomerRepository,
  );

  return { useCase, findByMonth, findOne };
}

describe('GetEsgIndicatorsUseCase', () => {
  it('returns the stored values of the month for an owned customer', async () => {
    const { useCase, findByMonth, findOne } = buildUseCase();

    await expect(
      useCase.execute('customer-1', 'owner-1', '2026-09'),
    ).resolves.toEqual(VALUES);

    expect(findOne).toHaveBeenCalledWith('customer-1', 'owner-1');
    expect(findByMonth).toHaveBeenCalledWith(
      'customer-1',
      new Date('2026-09-01T00:00:00.000Z'),
    );
  });

  it('throws CustomerNotFoundError when the customer is not the owner’s', async () => {
    const { useCase, findByMonth } = buildUseCase(null);

    await expect(
      useCase.execute('customer-1', 'owner-1', '2026-09'),
    ).rejects.toBeInstanceOf(CustomerNotFoundError);
    expect(findByMonth).not.toHaveBeenCalled();
  });

  it('rejects an invalid month before touching the database', async () => {
    const { useCase, findOne } = buildUseCase();

    await expect(
      useCase.execute('customer-1', 'owner-1', '2026-13'),
    ).rejects.toBeInstanceOf(InvalidReferenceMonthError);
    expect(findOne).not.toHaveBeenCalled();
  });
});
