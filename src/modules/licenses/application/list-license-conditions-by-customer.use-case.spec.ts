import { CustomerRepository } from '../../customers/domain/customers.repository';
import { LicenseConditionStatus } from '@prisma/client';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { LicenseCondition } from '../domain/license-condition.entity';
import { LicenseConditionRiskLevel } from '../domain/license-condition-risk-level';
import { LicenseConditionRepository } from '../domain/license-conditions.repository';
import { ListLicenseConditionsByCustomerUseCase } from './list-license-conditions-by-customer.use-case';

function buildUseCase(overrides?: {
  customerRepository?: Partial<CustomerRepository>;
  licenseConditionRepository?: Partial<LicenseConditionRepository>;
}) {
  const customerRepository: Partial<CustomerRepository> = {
    findOne: jest.fn().mockResolvedValue({ id: 'customer-1' }),
    ...overrides?.customerRepository,
  };
  const licenseConditionRepository: Partial<LicenseConditionRepository> = {
    findAllByCustomerId: jest.fn().mockResolvedValue([]),
    ...overrides?.licenseConditionRepository,
  };

  const useCase = new ListLicenseConditionsByCustomerUseCase(
    licenseConditionRepository as LicenseConditionRepository,
    customerRepository as CustomerRepository,
  );

  return { useCase, customerRepository, licenseConditionRepository };
}

function buildCondition(
  overrides: Partial<LicenseCondition>,
): LicenseCondition {
  return {
    id: 'condition-1',
    licenseId: 'license-1',
    name: 'Automonitoramento Atmosférico',
    description: 'Avaliação periódica de emissões.',
    category: { id: 'metric-emissoes', name: 'Emissões' },
    responsibleAgency: 'FEPAM',
    dueDate: new Date('2026-02-15T00:00:00.000Z'),
    status: LicenseConditionStatus.REGULAR,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('ListLicenseConditionsByCustomerUseCase', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('throws CustomerNotFoundError when the customer is missing or not owned', async () => {
    const { useCase, customerRepository } = buildUseCase({
      customerRepository: { findOne: jest.fn().mockResolvedValue(null) },
    });

    await expect(useCase.execute('customer-1', 'owner-1')).rejects.toThrow(
      CustomerNotFoundError,
    );
    expect(customerRepository.findOne).toHaveBeenCalledWith(
      'customer-1',
      'owner-1',
    );
  });

  it('never queries conditions for a customer that is not found', async () => {
    const { useCase, licenseConditionRepository } = buildUseCase({
      customerRepository: { findOne: jest.fn().mockResolvedValue(null) },
    });

    await expect(useCase.execute('customer-1', 'owner-1')).rejects.toThrow();
    expect(
      licenseConditionRepository.findAllByCustomerId,
    ).not.toHaveBeenCalled();
  });

  it('classifies due dates and orders critical risks first', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const { useCase, licenseConditionRepository } = buildUseCase({
      licenseConditionRepository: {
        findAllByCustomerId: jest.fn().mockResolvedValue([
          buildCondition({
            id: 'condition-regular',
            dueDate: new Date('2026-02-15T00:00:00.000Z'),
          }),
          buildCondition({
            id: 'condition-risk',
            dueDate: new Date('2026-01-04T00:00:00.000Z'),
          }),
          buildCondition({
            id: 'condition-attention',
            dueDate: new Date('2026-01-16T00:00:00.000Z'),
          }),
        ]),
      },
    });

    const result = await useCase.execute('customer-1', 'owner-1');

    expect(licenseConditionRepository.findAllByCustomerId).toHaveBeenCalledWith(
      'customer-1',
    );
    expect(result.total).toBe(3);
    expect(result.data.map((condition) => condition.id)).toEqual([
      'condition-risk',
      'condition-attention',
      'condition-regular',
    ]);
    expect(result.data.map((condition) => condition.riskLevel)).toEqual([
      LicenseConditionRiskLevel.RISK,
      LicenseConditionRiskLevel.ATTENTION,
      LicenseConditionRiskLevel.REGULAR,
    ]);
  });

  it.each([
    [LicenseConditionRiskLevel.RISK, ['condition-risk']],
    [LicenseConditionRiskLevel.ATTENTION, ['condition-attention']],
    [LicenseConditionRiskLevel.REGULAR, ['condition-regular']],
  ])('filters conditions by %s', async (riskLevel, expectedIds) => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const { useCase } = buildUseCase({
      licenseConditionRepository: {
        findAllByCustomerId: jest.fn().mockResolvedValue([
          buildCondition({
            id: 'condition-regular',
            dueDate: new Date('2026-02-15T00:00:00.000Z'),
          }),
          buildCondition({
            id: 'condition-risk',
            dueDate: new Date('2026-01-04T00:00:00.000Z'),
          }),
          buildCondition({
            id: 'condition-attention',
            dueDate: new Date('2026-01-16T00:00:00.000Z'),
          }),
        ]),
      },
    });

    const result = await useCase.execute('customer-1', 'owner-1', riskLevel);

    expect(result.total).toBe(expectedIds.length);
    expect(result.data.map((condition) => condition.id)).toEqual(expectedIds);
    expect(
      result.data.every((condition) => condition.riskLevel === riskLevel),
    ).toBe(true);
  });
});
