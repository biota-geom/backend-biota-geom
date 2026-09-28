import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { LicenseConditionNotFoundError } from '../domain/errors/license-condition-not-found.error';
import { LicenseNotFoundError } from '../domain/errors/license-not-found.error';
import { LicenseCondition } from '../domain/license-condition.entity';
import { LicenseConditionRiskLevel } from '../domain/license-condition-risk-level';
import { LicenseConditionRepository } from '../domain/license-conditions.repository';
import { LicenseRepository } from '../domain/licenses.repository';
import { UpdateLicenseConditionData } from '../domain/update-license-condition.data';
import { UpdateLicenseConditionUseCase } from './update-license-condition.use-case';

function buildCondition(
  overrides: Partial<LicenseCondition> = {},
): LicenseCondition {
  return {
    id: 'condition-1',
    licenseId: 'license-1',
    title: 'MTR - Manifesto de Transporte de Resíduos',
    description: 'Emissão de manifesto obrigatório.',
    category: 'Resíduos',
    dueDate: new Date('2026-06-30T00:00:00.000Z'),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  };
}

function buildData(
  overrides: Partial<UpdateLicenseConditionData> = {},
): UpdateLicenseConditionData {
  return {
    licenseId: 'license-1',
    title: 'MTR - Manifesto de Transporte de Resíduos',
    description: 'Emissão de manifesto obrigatório.',
    category: 'Resíduos',
    dueDate: new Date('2026-06-30T00:00:00.000Z'),
    ...overrides,
  };
}

function buildUseCase(overrides?: {
  customerRepository?: Partial<CustomerRepository>;
  licenseConditionRepository?: Partial<LicenseConditionRepository>;
  licenseRepository?: Partial<LicenseRepository>;
}) {
  const customerRepository: Partial<CustomerRepository> = {
    findOne: jest.fn().mockResolvedValue({ id: 'customer-1' }),
    ...overrides?.customerRepository,
  };
  const licenseRepository: Partial<LicenseRepository> = {
    findByIdForCustomer: jest.fn().mockResolvedValue({ id: 'license-1' }),
    ...overrides?.licenseRepository,
  };
  const licenseConditionRepository: Partial<LicenseConditionRepository> = {
    update: jest.fn().mockResolvedValue(buildCondition()),
    ...overrides?.licenseConditionRepository,
  };

  const useCase = new UpdateLicenseConditionUseCase(
    licenseConditionRepository as LicenseConditionRepository,
    licenseRepository as LicenseRepository,
    customerRepository as CustomerRepository,
  );

  return {
    useCase,
    customerRepository,
    licenseRepository,
    licenseConditionRepository,
  };
}

describe('UpdateLicenseConditionUseCase', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('throws CustomerNotFoundError when the customer is missing or not owned', async () => {
    const { useCase, customerRepository } = buildUseCase({
      customerRepository: { findOne: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      useCase.execute('condition-1', 'customer-1', 'owner-1', buildData()),
    ).rejects.toThrow(CustomerNotFoundError);
    expect(customerRepository.findOne).toHaveBeenCalledWith(
      'customer-1',
      'owner-1',
    );
  });

  it('never writes when the customer is not found', async () => {
    const { useCase, licenseConditionRepository } = buildUseCase({
      customerRepository: { findOne: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      useCase.execute('condition-1', 'customer-1', 'owner-1', buildData()),
    ).rejects.toThrow();
    expect(licenseConditionRepository.update).not.toHaveBeenCalled();
  });

  it('throws LicenseNotFoundError when the linked license belongs to another customer', async () => {
    const { useCase, licenseRepository, licenseConditionRepository } =
      buildUseCase({
        licenseRepository: {
          findByIdForCustomer: jest.fn().mockResolvedValue(null),
        },
      });

    await expect(
      useCase.execute(
        'condition-1',
        'customer-1',
        'owner-1',
        buildData({ licenseId: 'license-from-another-customer' }),
      ),
    ).rejects.toThrow(LicenseNotFoundError);
    expect(licenseRepository.findByIdForCustomer).toHaveBeenCalledWith(
      'license-from-another-customer',
      'customer-1',
    );
    expect(licenseConditionRepository.update).not.toHaveBeenCalled();
  });

  it('throws LicenseConditionNotFoundError when no row matches the customer', async () => {
    const { useCase } = buildUseCase({
      licenseConditionRepository: {
        update: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(
      useCase.execute('condition-1', 'customer-1', 'owner-1', buildData()),
    ).rejects.toThrow(LicenseConditionNotFoundError);
  });

  it('scopes the write to the customer and returns the persisted condition', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const data = buildData();
    const { useCase, licenseConditionRepository } = buildUseCase();

    const result = await useCase.execute(
      'condition-1',
      'customer-1',
      'owner-1',
      data,
    );

    expect(licenseConditionRepository.update).toHaveBeenCalledWith(
      'condition-1',
      'customer-1',
      data,
    );
    expect(result.id).toBe('condition-1');
    expect(result.title).toBe('MTR - Manifesto de Transporte de Resíduos');
  });

  it('recalculates the risk level from the due date that was just saved', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const { useCase } = buildUseCase({
      licenseConditionRepository: {
        update: jest.fn().mockResolvedValue(
          buildCondition({
            dueDate: new Date('2026-01-04T00:00:00.000Z'),
          }),
        ),
      },
    });

    const result = await useCase.execute(
      'condition-1',
      'customer-1',
      'owner-1',
      buildData({ dueDate: new Date('2026-01-04T00:00:00.000Z') }),
    );

    expect(result.riskLevel).toBe(LicenseConditionRiskLevel.RISK);
  });

  it('answers REGULAR when the new due date is far enough away', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const { useCase } = buildUseCase();

    const result = await useCase.execute(
      'condition-1',
      'customer-1',
      'owner-1',
      buildData(),
    );

    expect(result.riskLevel).toBe(LicenseConditionRiskLevel.REGULAR);
  });
});
