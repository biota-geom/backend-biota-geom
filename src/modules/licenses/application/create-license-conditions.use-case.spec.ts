import { ConditionStatus, ConditionType } from '@prisma/client';
import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { LicenseNotFoundError } from '../domain/errors/license-not-found.error';
import { LicenseRepository } from '../domain/licenses.repository';
import { CreateLicenseConditionUseCase } from './create-license-conditions.use-case';

function buildUseCase(overrides?: {
  customerRepository?: Partial<CustomerRepository>;
  repository?: Partial<LicenseRepository>;
}) {
  const customerRepository: Partial<CustomerRepository> = {
    findOne: jest.fn().mockResolvedValue({ id: 'customer-1' }),
    ...overrides?.customerRepository,
  };
  const repository: Partial<LicenseRepository> = {
    findById: jest
      .fn()
      .mockResolvedValue({ id: 'license-1', customerId: 'customer-1' }),
    createConditions: jest.fn().mockResolvedValue({ count: 1 }),
    ...overrides?.repository,
  };

  return {
    useCase: new CreateLicenseConditionUseCase(
      repository as LicenseRepository,
      customerRepository as CustomerRepository,
    ),
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
          environmental_descriptor: 'Resíduos sólidos',
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
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates conditions with a computed-number-ready descriptor', async () => {
    const { useCase, repository } = buildUseCase();
    const deadline = new Date('2027-01-01T00:00:00.000Z');
    jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);

    await expect(useCase.execute(buildInput())).resolves.toEqual({
      count: 1,
      message: 'Condicionantes vinculadas com sucesso',
    });
    expect(repository.createConditions).toHaveBeenCalledWith([
      {
        licenseId: 'license-1',
        environmentalDescriptor: 'Resíduos sólidos',
        name: 'Relatório',
        description: 'Relatório',
        responsibleName: 'Ana',
        conditionType: ConditionType.INFORMATIVE,
        periodicity: null,
        deadline,
        dueDate: deadline,
        conditionStatus: ConditionStatus.IN_PROGRESS,
        hasDelivery: true,
        createdAt: new Date(1_800_000_000_000),
      },
    ]);
  });

  it('preserves payload order with increasing creation timestamps', async () => {
    const { useCase, repository } = buildUseCase();
    jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
    const input = buildInput();
    input.data.conditions.push({
      environmental_descriptor: 'Água',
      description: 'Laudo',
      responsible_name: 'Bia',
      condition_type: ConditionType.INFORMATIVE,
      deadline: '2027-02-01T00:00:00.000Z',
    });

    await useCase.execute(input);

    const createConditions = jest.mocked(repository.createConditions!);
    const created = createConditions.mock.calls[0]?.[0];
    if (!created) throw new Error('Expected conditions to be created');
    expect(created.map((condition) => condition.createdAt.getTime())).toEqual([
      1_800_000_000_000, 1_800_000_000_001,
    ]);
  });

  it('uses the given title, periodicity and delivery setting', async () => {
    const { useCase, repository } = buildUseCase();

    await useCase.execute(
      buildInput({
        title: 'Monitoramento de efluentes',
        condition_type: ConditionType.PERIODIC,
        periodicity: 'MONTHLY',
        has_delivery: false,
      }),
    );

    expect(repository.createConditions).toHaveBeenCalledWith([
      expect.objectContaining({
        name: 'Monitoramento de efluentes',
        periodicity: 'MONTHLY',
        hasDelivery: false,
      }),
    ]);
  });

  it('rejects an unknown customer', async () => {
    const { useCase } = buildUseCase({
      customerRepository: { findOne: jest.fn().mockResolvedValue(null) },
    });
    await expect(useCase.execute(buildInput())).rejects.toThrow(
      CustomerNotFoundError,
    );
  });

  it.each([null, { id: 'license-1', customerId: 'customer-2' }])(
    'rejects an unknown or foreign license',
    async (license) => {
      const { useCase } = buildUseCase({
        repository: { findById: jest.fn().mockResolvedValue(license) },
      });
      await expect(useCase.execute(buildInput())).rejects.toThrow(
        LicenseNotFoundError,
      );
    },
  );
});
