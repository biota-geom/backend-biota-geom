import { LicenseConditionStatus } from '@prisma/client';
import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { LicenseCondition } from '../domain/license-condition.entity';
import { LicenseConditionRepository } from '../domain/license-conditions.repository';
import { GetLicenseConditionsComplianceUseCase } from './get-license-conditions-compliance.use-case';

const NOW = new Date('2026-09-29T12:00:00.000Z');
const DAY_IN_MS = 24 * 60 * 60 * 1000;

function buildCondition(dueInDays: number, index: number): LicenseCondition {
  return {
    id: `condition-${index}`,
    licenseId: 'license-1',
    name: `Condicionante ${index}`,
    description: null,
    category: { id: 'metric-emissoes', name: 'Emissões' },
    responsibleAgency: null,
    dueDate: new Date(NOW.getTime() + dueInDays * DAY_IN_MS),
    // Persisted status is ignored: compliance follows the due date.
    status: LicenseConditionStatus.REGULAR,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function buildUseCase(options: {
  customer?: unknown;
  conditions?: LicenseCondition[];
}) {
  const customerRepository: Partial<CustomerRepository> = {
    findOne: jest
      .fn()
      .mockResolvedValue(
        'customer' in options ? options.customer : { id: 'customer-1' },
      ),
  };
  const licenseConditionRepository: Partial<LicenseConditionRepository> = {
    findAllByCustomerId: jest.fn().mockResolvedValue(options.conditions ?? []),
  };
  const useCase = new GetLicenseConditionsComplianceUseCase(
    licenseConditionRepository as LicenseConditionRepository,
    customerRepository as CustomerRepository,
  );

  return { useCase, customerRepository, licenseConditionRepository };
}

describe('GetLicenseConditionsComplianceUseCase', () => {
  it('counts only regular conditions as compliant', async () => {
    const dueInDays = [60, 60, 60, 60, 15, 15, -1, -5];
    const { useCase, customerRepository, licenseConditionRepository } =
      buildUseCase({ conditions: dueInDays.map(buildCondition) });

    await expect(
      useCase.execute('customer-1', 'owner-1', NOW),
    ).resolves.toEqual({
      totalActive: 8,
      inCompliance: 4,
      compliancePercentage: 50,
    });
    expect(customerRepository.findOne).toHaveBeenCalledWith(
      'customer-1',
      'owner-1',
    );
    expect(licenseConditionRepository.findAllByCustomerId).toHaveBeenCalledWith(
      'customer-1',
    );
  });

  it('returns 100% for a customer without conditions', async () => {
    const { useCase } = buildUseCase({ conditions: [] });

    await expect(
      useCase.execute('customer-1', 'owner-1', NOW),
    ).resolves.toEqual({
      totalActive: 0,
      inCompliance: 0,
      compliancePercentage: 100,
    });
  });

  it('throws CustomerNotFoundError without reading conditions when the customer is not owned', async () => {
    const { useCase, licenseConditionRepository } = buildUseCase({
      customer: null,
    });

    await expect(useCase.execute('customer-1', 'owner-2', NOW)).rejects.toThrow(
      CustomerNotFoundError,
    );
    expect(
      licenseConditionRepository.findAllByCustomerId,
    ).not.toHaveBeenCalled();
  });

  it('defaults to the current date', async () => {
    jest.useFakeTimers().setSystemTime(NOW);
    const { useCase } = buildUseCase({ conditions: [buildCondition(10, 1)] });

    await expect(useCase.execute('customer-1', 'owner-1')).resolves.toEqual({
      totalActive: 1,
      inCompliance: 0,
      compliancePercentage: 0,
    });
    jest.useRealTimers();
  });
});
