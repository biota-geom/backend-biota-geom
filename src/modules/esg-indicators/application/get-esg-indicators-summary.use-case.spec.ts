import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { CustomerIndicatorRepository } from '../domain/customer-indicators.repository';
import { EsgIndicatorRecordRepository } from '../domain/esg-indicator-records.repository';
import { InvalidReferenceMonthError } from '../domain/errors/invalid-reference-month.error';
import { GetEsgIndicatorsSummaryUseCase } from './get-esg-indicators-summary.use-case';

const SEPTEMBER = new Date('2026-09-01T00:00:00.000Z');
const AUGUST = new Date('2026-08-01T00:00:00.000Z');

const WATER = {
  id: 'ind-1',
  name: 'Consumo de Água',
  unit: 'm³',
  category: 'Ambiental' as const,
};
const STAFF = {
  id: 'ind-2',
  name: 'Colaboradores',
  unit: 'un',
  category: 'Social' as const,
};

const VALUES_BY_MONTH = new Map([
  [
    SEPTEMBER.getTime(),
    new Map([
      ['ind-1', 1100],
      ['ind-2', 148],
    ]),
  ],
  [
    AUGUST.getTime(),
    new Map([
      ['ind-1', 1000],
      ['ind-2', 150],
    ]),
  ],
]);

function buildUseCase(
  options: { customer?: unknown; latestMonth?: Date | null } = {},
) {
  const findValuesByMonth = jest.fn((_customerId: string, month: Date) =>
    Promise.resolve(VALUES_BY_MONTH.get(month.getTime()) ?? new Map()),
  );
  const findLatestMonth = jest
    .fn()
    .mockResolvedValue(
      options.latestMonth === undefined ? SEPTEMBER : options.latestMonth,
    );
  const findActive = jest.fn().mockResolvedValue([WATER, STAFF]);
  const findOne = jest
    .fn()
    .mockResolvedValue(
      options.customer === undefined ? { id: 'customer-1' } : options.customer,
    );
  const useCase = new GetEsgIndicatorsSummaryUseCase(
    {
      findValuesByMonth,
      findLatestMonth,
    } as unknown as EsgIndicatorRecordRepository,
    { findActive } as unknown as CustomerIndicatorRepository,
    { findOne } as unknown as CustomerRepository,
  );

  return { useCase, findValuesByMonth, findLatestMonth, findActive, findOne };
}

describe('GetEsgIndicatorsSummaryUseCase', () => {
  it('compares the asked month with the month right before it', async () => {
    const { useCase, findValuesByMonth, findLatestMonth, findOne } =
      buildUseCase();

    await expect(
      useCase.execute('customer-1', 'owner-1', '2026-09'),
    ).resolves.toEqual({
      referenceMonth: '2026-09',
      indicators: [
        { ...WATER, current: 1100, previous: 1000, variationPct: 10 },
        { ...STAFF, current: 148, previous: 150, variationPct: -1.3 },
      ],
    });

    expect(findOne).toHaveBeenCalledWith('customer-1', 'owner-1');
    expect(findLatestMonth).not.toHaveBeenCalled();
    expect(findValuesByMonth).toHaveBeenCalledWith('customer-1', SEPTEMBER);
    expect(findValuesByMonth).toHaveBeenCalledWith('customer-1', AUGUST);
  });

  it('uses the latest month with a record when no month is given', async () => {
    const { useCase, findLatestMonth } = buildUseCase();

    const summary = await useCase.execute('customer-1', 'owner-1');

    expect(findLatestMonth).toHaveBeenCalledWith('customer-1');
    expect(summary.referenceMonth).toBe('2026-09');
    expect(summary.indicators[0].variationPct).toBe(10);
  });

  it('returns null variations for a month without a previous record', async () => {
    const { useCase } = buildUseCase();

    const summary = await useCase.execute('customer-1', 'owner-1', '2026-08');

    expect(summary.indicators[0]).toEqual({
      ...WATER,
      current: 1000,
      previous: null,
      variationPct: null,
    });
  });

  it('lists the indicators empty when the customer has no record at all', async () => {
    const { useCase, findValuesByMonth } = buildUseCase({ latestMonth: null });

    await expect(useCase.execute('customer-1', 'owner-1')).resolves.toEqual({
      referenceMonth: null,
      indicators: [
        { ...WATER, current: null, previous: null, variationPct: null },
        { ...STAFF, current: null, previous: null, variationPct: null },
      ],
    });
    expect(findValuesByMonth).not.toHaveBeenCalled();
  });

  it('throws CustomerNotFoundError when the customer is not the owner’s', async () => {
    const { useCase, findActive, findLatestMonth } = buildUseCase({
      customer: null,
    });

    await expect(
      useCase.execute('customer-1', 'owner-1'),
    ).rejects.toBeInstanceOf(CustomerNotFoundError);
    expect(findActive).not.toHaveBeenCalled();
    expect(findLatestMonth).not.toHaveBeenCalled();
  });

  it('rejects an invalid month before touching the database', async () => {
    const { useCase, findOne } = buildUseCase();

    await expect(
      useCase.execute('customer-1', 'owner-1', '2026-13'),
    ).rejects.toBeInstanceOf(InvalidReferenceMonthError);
    expect(findOne).not.toHaveBeenCalled();
  });
});
