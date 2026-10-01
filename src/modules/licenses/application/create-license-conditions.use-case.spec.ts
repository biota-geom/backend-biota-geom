import { ConditionStatus, ConditionType } from '@prisma/client';
import { CustomerEsgMetricRepository } from '../../customers/domain/customer-esg-metric.repository';
import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { EsgMetricRepository } from '../../esg-metrics/domain/repositories/esg-metric.repository';
import { ConditionCategoryNotFoundError } from '../domain/errors/condition-category-not-found.error';
import { ConditionCategoryNotLinkedError } from '../domain/errors/condition-category-not-linked.error';
import { LicenseNotFoundError } from '../domain/errors/license-not-found.error';
import { LicenseRepository } from '../domain/licenses.repository';
import { CreateLicenseConditionUseCase } from './create-license-conditions.use-case';

const METRIC_ID = 'metric-1';

function buildUseCase(overrides?: {
  customerRepository?: Partial<CustomerRepository>;
  repository?: Partial<LicenseRepository>;
  esgMetricRepository?: Partial<EsgMetricRepository>;
  customerEsgMetricRepository?: Partial<CustomerEsgMetricRepository>;
}) {
  const customerRepository: Partial<CustomerRepository> = {
    findOne: jest.fn().mockResolvedValue({ id: 'customer-1' }),
    ...overrides?.customerRepository,
  };
  const repository: Partial<LicenseRepository> = {
    findById: jest
      .fn()
      .mockResolvedValue({ id: 'license-1', customerId: 'customer-1' }),
    createConditions: jest.fn().mockResolvedValue({ count: 2 }),
    ...overrides?.repository,
  };
  const esgMetricRepository: Partial<EsgMetricRepository> = {
    findByIds: jest
      .fn()
      .mockResolvedValue([{ id: METRIC_ID, customerId: null }]),
    ...overrides?.esgMetricRepository,
  };
  const customerEsgMetricRepository: Partial<CustomerEsgMetricRepository> = {
    findLinkedMetricIds: jest.fn().mockResolvedValue([METRIC_ID]),
    ...overrides?.customerEsgMetricRepository,
  };

  return {
    useCase: new CreateLicenseConditionUseCase(
      repository as LicenseRepository,
      customerRepository as CustomerRepository,
      esgMetricRepository as EsgMetricRepository,
      customerEsgMetricRepository as CustomerEsgMetricRepository,
    ),
    customerRepository,
    repository,
  };
}

function buildInput(condition: Record<string, unknown> = {}) {
  return {
    customerId: 'customer-1',
    licenseId: 'license-1',
    userId: 'owner-1',
    data: {
      conditions: [
        {
          esg_metric_id: METRIC_ID,
          item_number: '1.1',
          description: 'Relatório',
          responsible_name: 'Ana',
          condition_type: ConditionType.INFORMATIVE,
          deadline: '2027-01-01T00:00:00.000Z',
          ...condition,
        },
      ],
    },
  };
}

describe('CreateLicenseConditionUseCase', () => {
  it('creates conditions categorized by a GRI parameter of the customer', async () => {
    const { useCase, repository } = buildUseCase();

    await expect(useCase.execute(buildInput())).resolves.toEqual({
      count: 2,
      message: 'Condicionantes vinculadas com sucesso',
    });
    const deadline = new Date('2027-01-01T00:00:00.000Z');
    expect(repository.createConditions).toHaveBeenCalledWith([
      {
        licenseId: 'license-1',
        esgMetricId: METRIC_ID,
        itemNumber: '1.1',
        name: 'Item 1.1',
        description: 'Relatório',
        responsibleName: 'Ana',
        conditionType: ConditionType.INFORMATIVE,
        periodicity: null,
        deadline,
        dueDate: deadline,
        conditionStatus: ConditionStatus.IN_PROGRESS,
      },
    ]);
  });

  it('uses the given title and periodicity', async () => {
    const { useCase, repository } = buildUseCase();

    await useCase.execute(
      buildInput({
        title: 'Monitoramento de efluentes',
        condition_type: ConditionType.PERIODIC,
        periodicity: 'MONTHLY',
      }),
    );

    expect(repository.createConditions).toHaveBeenCalledWith([
      expect.objectContaining({
        name: 'Monitoramento de efluentes',
        periodicity: 'MONTHLY',
      }),
    ]);
  });

  it('returns zero when nothing was created', async () => {
    const { useCase } = buildUseCase({
      repository: {
        findById: jest
          .fn()
          .mockResolvedValue({ id: 'license-1', customerId: 'customer-1' }),
        createConditions: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(useCase.execute(buildInput())).resolves.toEqual(
      expect.objectContaining({ count: 0 }),
    );
  });

  it('rejects an unknown customer', async () => {
    const { useCase, repository } = buildUseCase({
      customerRepository: { findOne: jest.fn().mockResolvedValue(null) },
    });

    await expect(useCase.execute(buildInput())).rejects.toThrow(
      CustomerNotFoundError,
    );
    expect(repository.createConditions).not.toHaveBeenCalled();
  });

  it.each([
    ['an unknown license', null],
    [
      'a license of another customer',
      { id: 'license-1', customerId: 'customer-2' },
    ],
  ])('rejects %s as not found', async (_, license) => {
    const { useCase, repository } = buildUseCase({
      repository: {
        findById: jest.fn().mockResolvedValue(license),
        createConditions: jest.fn(),
      },
    });

    await expect(useCase.execute(buildInput())).rejects.toThrow(
      LicenseNotFoundError,
    );
    expect(repository.createConditions).not.toHaveBeenCalled();
  });

  it('rejects a GRI parameter that does not exist', async () => {
    const { useCase, repository } = buildUseCase({
      esgMetricRepository: { findByIds: jest.fn().mockResolvedValue([]) },
    });

    await expect(useCase.execute(buildInput())).rejects.toThrow(
      ConditionCategoryNotFoundError,
    );
    expect(repository.createConditions).not.toHaveBeenCalled();
  });

  it('rejects a GRI parameter not linked to the customer', async () => {
    const { useCase, repository } = buildUseCase({
      customerEsgMetricRepository: {
        findLinkedMetricIds: jest.fn().mockResolvedValue([]),
      },
    });

    await expect(useCase.execute(buildInput())).rejects.toThrow(
      ConditionCategoryNotLinkedError,
    );
    expect(repository.createConditions).not.toHaveBeenCalled();
  });
});
