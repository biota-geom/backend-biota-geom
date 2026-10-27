import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { CustomerIndicatorRepository } from '../domain/customer-indicators.repository';
import { EsgIndicatorRecordRepository } from '../domain/esg-indicator-records.repository';
import { DuplicatedIndicatorRecordError } from '../domain/errors/duplicated-indicator-record.error';
import { IndicatorNotConfiguredError } from '../domain/errors/indicator-not-configured.error';
import { InvalidReferenceMonthError } from '../domain/errors/invalid-reference-month.error';
import { GetEsgIndicatorsUseCase } from './get-esg-indicators.use-case';
import { SaveEsgIndicatorsUseCase } from './save-esg-indicators.use-case';

const LISTED = [
  { id: 'ind-1', name: 'Água', unit: 'm³', category: 'Ambiental', value: 10 },
];
const MONTH = new Date('2026-09-01T00:00:00.000Z');

function buildUseCase(customer: unknown = { id: 'customer-1' }) {
  const saveMonth = jest.fn().mockResolvedValue(undefined);
  const findActive = jest
    .fn()
    .mockResolvedValue([{ id: 'ind-1' }, { id: 'ind-2' }]);
  const findOne = jest.fn().mockResolvedValue(customer);
  const listMonth = jest.fn().mockResolvedValue(LISTED);
  const useCase = new SaveEsgIndicatorsUseCase(
    { saveMonth } as unknown as EsgIndicatorRecordRepository,
    { findActive } as unknown as CustomerIndicatorRepository,
    { findOne } as unknown as CustomerRepository,
    { listMonth } as unknown as GetEsgIndicatorsUseCase,
  );

  return { useCase, saveMonth, findActive, findOne, listMonth };
}

const input = (records: { indicatorId: string; value: number | null }[]) => ({
  customerId: 'customer-1',
  ownerUserId: 'owner-1',
  month: '2026-09',
  records,
});

describe('SaveEsgIndicatorsUseCase', () => {
  it('saves the records and returns the month as stored', async () => {
    const { useCase, saveMonth, listMonth } = buildUseCase();
    const records = [
      { indicatorId: 'ind-1', value: 10 },
      { indicatorId: 'ind-2', value: null },
    ];

    await expect(useCase.execute(input(records))).resolves.toEqual(LISTED);

    expect(saveMonth).toHaveBeenCalledWith('customer-1', MONTH, records);
    expect(listMonth).toHaveBeenCalledWith('customer-1', MONTH);
  });

  it('does not open a transaction when there is nothing to save', async () => {
    const { useCase, saveMonth, listMonth } = buildUseCase();

    await expect(useCase.execute(input([]))).resolves.toEqual(LISTED);
    expect(saveMonth).not.toHaveBeenCalled();
    expect(listMonth).toHaveBeenCalled();
  });

  it('throws CustomerNotFoundError when the customer is not the owner’s', async () => {
    const { useCase, saveMonth } = buildUseCase(null);

    await expect(
      useCase.execute(input([{ indicatorId: 'ind-1', value: 1 }])),
    ).rejects.toBeInstanceOf(CustomerNotFoundError);
    expect(saveMonth).not.toHaveBeenCalled();
  });

  it('rejects an invalid month', async () => {
    const { useCase, findOne } = buildUseCase();

    await expect(
      useCase.execute({ ...input([]), month: '2026-13' }),
    ).rejects.toBeInstanceOf(InvalidReferenceMonthError);
    expect(findOne).not.toHaveBeenCalled();
  });

  it('rejects an indicator that is not configured for the customer', async () => {
    const { useCase, saveMonth } = buildUseCase();

    await expect(
      useCase.execute(
        input([
          { indicatorId: 'ind-1', value: 1 },
          { indicatorId: 'foreign', value: 2 },
        ]),
      ),
    ).rejects.toBeInstanceOf(IndicatorNotConfiguredError);
    expect(saveMonth).not.toHaveBeenCalled();
  });

  it('rejects the same indicator twice in one request', async () => {
    const { useCase, saveMonth } = buildUseCase();

    await expect(
      useCase.execute(
        input([
          { indicatorId: 'ind-1', value: 1 },
          { indicatorId: 'ind-1', value: 2 },
        ]),
      ),
    ).rejects.toBeInstanceOf(DuplicatedIndicatorRecordError);
    expect(saveMonth).not.toHaveBeenCalled();
  });
});
