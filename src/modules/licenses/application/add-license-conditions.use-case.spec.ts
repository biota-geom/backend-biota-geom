import {
  LicenseConditionStatus,
  LicenseConditionTargetOperator,
  LicenseStatus,
  LicenseType,
} from '@prisma/client';
import { CustomerEsgMetricRepository } from '../../customers/domain/customer-esg-metric.repository';
import { CustomerRepository } from '../../customers/domain/customers.repository';
import { EsgMetricEntity } from '../../esg-metrics/domain/entities/esg-metric.entity';
import { EsgMetricRepository } from '../../esg-metrics/domain/repositories/esg-metric.repository';
import { ConditionCategoryNotFoundError } from '../domain/errors/condition-category-not-found.error';
import { ConditionCategoryNotLinkedError } from '../domain/errors/condition-category-not-linked.error';
import { LicenseConditionLicenseMismatchError } from '../domain/errors/license-condition-license-mismatch.error';
import { InvalidConditionDueDateError } from '../domain/errors/invalid-condition-due-date.error';
import { InvalidConditionTargetError } from '../domain/errors/invalid-condition-target.error';
import { LicenseNotFoundError } from '../domain/errors/license-not-found.error';
import { LicenseConditionRepository } from '../domain/license-conditions.repository';
import { LicenseRepository } from '../domain/licenses.repository';
import { AddLicenseConditionsUseCase } from './add-license-conditions.use-case';

function metric(id: string, ownerUserId: string | null): EsgMetricEntity {
  return new EsgMetricEntity(
    id,
    'Resíduos',
    't',
    'AMBIENTAL',
    ownerUserId,
    null,
  );
}

function buildUseCase(overrides?: {
  customerRepository?: Partial<CustomerRepository>;
  esgMetricRepository?: Partial<EsgMetricRepository>;
  customerEsgMetricRepository?: Partial<CustomerEsgMetricRepository>;
  licenseConditionRepository?: Partial<LicenseConditionRepository>;
  licenseRepository?: Partial<LicenseRepository>;
}) {
  const licenseConditionRepository: Partial<LicenseConditionRepository> = {
    addMany: jest.fn().mockResolvedValue([]),
    ...overrides?.licenseConditionRepository,
  };
  const licenseRepository: Partial<LicenseRepository> = {
    findById: jest.fn().mockResolvedValue({
      id: 'license-1',
      customerId: 'customer-1',
      type: LicenseType.LO,
      processNumber: 'LO 118/2020',
      issuingAgencyId: 'agency-1',
      issueDate: new Date('2020-01-01T00:00:00.000Z'),
      expirationDate: new Date('2028-01-01T00:00:00.000Z'),
      status: LicenseStatus.REGULAR,
      documentUrl: 'https://example.com/license.pdf',
      createdAt: new Date('2020-01-01T00:00:00.000Z'),
      updatedAt: new Date('2020-01-01T00:00:00.000Z'),
    }),
    ...overrides?.licenseRepository,
  };
  const customerRepository: Partial<CustomerRepository> = {
    findOne: jest.fn().mockResolvedValue({ id: 'customer-1' }),
    ...overrides?.customerRepository,
  };
  const esgMetricRepository: Partial<EsgMetricRepository> = {
    findByIds: jest.fn().mockResolvedValue([metric('metric-1', null)]),
    ...overrides?.esgMetricRepository,
  };
  const customerEsgMetricRepository: Partial<CustomerEsgMetricRepository> = {
    findLinkedMetricIds: jest.fn().mockResolvedValue(['metric-1']),
    ...overrides?.customerEsgMetricRepository,
  };

  const useCase = new AddLicenseConditionsUseCase(
    licenseConditionRepository as LicenseConditionRepository,
    licenseRepository as LicenseRepository,
    customerRepository as CustomerRepository,
    esgMetricRepository as EsgMetricRepository,
    customerEsgMetricRepository as CustomerEsgMetricRepository,
  );

  return {
    useCase,
    customerRepository,
    esgMetricRepository,
    customerEsgMetricRepository,
    licenseConditionRepository,
    licenseRepository,
  };
}

function input(status?: LicenseConditionStatus) {
  return {
    licenseId: 'license-1',
    ownerUserId: 'owner-1',
    conditions: [
      {
        licenseId: 'license-1',
        name: 'MTR',
        esgMetricId: 'metric-1',
        responsibleAgency: 'FEPAM',
        dueDate: new Date('2027-05-20T00:00:00.000Z'),
        status,
        description: 'Manifesto de transporte.',
      },
    ],
  };
}

describe('AddLicenseConditionsUseCase', () => {
  it.each([undefined, new Date('invalid')])(
    'rejects a missing or invalid due date (%s) before touching repositories',
    async (dueDate) => {
      const { useCase, licenseRepository } = buildUseCase();
      const invalid = input();
      Object.assign(invalid.conditions[0], { dueDate });

      await expect(useCase.execute(invalid)).rejects.toThrow(
        InvalidConditionDueDateError,
      );
      expect(licenseRepository.findById).not.toHaveBeenCalled();
    },
  );

  it('rejects a partially informed target', async () => {
    const { useCase, licenseConditionRepository } = buildUseCase();
    const invalid = input();
    Object.assign(invalid.conditions[0], { targetMetricId: 'metric-1' });

    await expect(useCase.execute(invalid)).rejects.toThrow(
      InvalidConditionTargetError,
    );
    expect(licenseConditionRepository.addMany).not.toHaveBeenCalled();
  });

  it('persists a complete target and validates the target metric', async () => {
    const { useCase, esgMetricRepository, licenseConditionRepository } =
      buildUseCase({
        esgMetricRepository: {
          findByIds: jest
            .fn()
            .mockResolvedValue([
              metric('metric-1', null),
              metric('metric-2', null),
            ]),
        },
        customerEsgMetricRepository: {
          findLinkedMetricIds: jest
            .fn()
            .mockResolvedValue(['metric-1', 'metric-2']),
        },
      });
    const withTarget = input();
    Object.assign(withTarget.conditions[0], {
      targetMetricId: 'metric-2',
      targetOperator: LicenseConditionTargetOperator.LTE,
      targetValue: 8.5,
    });

    await useCase.execute(withTarget);

    expect(esgMetricRepository.findByIds).toHaveBeenCalledWith([
      'metric-1',
      'metric-2',
    ]);
    expect(licenseConditionRepository.addMany).toHaveBeenCalledWith([
      expect.objectContaining({
        targetMetricId: 'metric-2',
        targetOperator: 'LTE',
        targetValue: 8.5,
      }),
    ]);
  });

  it('rejects a target metric not linked to the customer', async () => {
    const { useCase } = buildUseCase({
      esgMetricRepository: {
        findByIds: jest
          .fn()
          .mockResolvedValue([
            metric('metric-1', null),
            metric('metric-2', null),
          ]),
      },
    });
    const withTarget = input();
    Object.assign(withTarget.conditions[0], {
      targetMetricId: 'metric-2',
      targetOperator: LicenseConditionTargetOperator.GTE,
      targetValue: 1,
    });

    await expect(useCase.execute(withTarget)).rejects.toThrow(
      ConditionCategoryNotLinkedError,
    );
  });

  it('validates every condition belongs to the route license before querying', async () => {
    const { useCase, licenseRepository } = buildUseCase();
    const invalid = input();
    invalid.conditions[0].licenseId = 'license-2';

    await expect(useCase.execute(invalid)).rejects.toThrow(
      LicenseConditionLicenseMismatchError,
    );
    expect(licenseRepository.findById).not.toHaveBeenCalled();
  });

  it('rejects an unknown license', async () => {
    const { useCase, customerRepository } = buildUseCase({
      licenseRepository: { findById: jest.fn().mockResolvedValue(null) },
    });

    await expect(useCase.execute(input())).rejects.toThrow(
      LicenseNotFoundError,
    );
    expect(customerRepository.findOne).not.toHaveBeenCalled();
  });

  it('rejects a license whose customer is not owned by the authenticated user', async () => {
    const { useCase, customerRepository, licenseConditionRepository } =
      buildUseCase({
        customerRepository: { findOne: jest.fn().mockResolvedValue(null) },
      });

    await expect(useCase.execute(input())).rejects.toThrow(
      LicenseNotFoundError,
    );
    expect(customerRepository.findOne).toHaveBeenCalledWith(
      'customer-1',
      'owner-1',
    );
    expect(licenseConditionRepository.addMany).not.toHaveBeenCalled();
  });

  it('uses Regular by default and persists the batch after validating ownership', async () => {
    const { useCase, licenseConditionRepository } = buildUseCase();

    await useCase.execute(input());

    expect(licenseConditionRepository.addMany).toHaveBeenCalledWith([
      expect.objectContaining({ status: LicenseConditionStatus.REGULAR }),
    ]);
  });

  it('preserves an explicitly selected initial status', async () => {
    const { useCase, licenseConditionRepository } = buildUseCase();

    await useCase.execute(input(LicenseConditionStatus.ATTENTION));

    expect(licenseConditionRepository.addMany).toHaveBeenCalledWith([
      expect.objectContaining({ status: LicenseConditionStatus.ATTENTION }),
    ]);
  });

  it('accepts a custom GRI parameter owned by the authenticated user', async () => {
    const { useCase, licenseConditionRepository } = buildUseCase({
      esgMetricRepository: {
        findByIds: jest.fn().mockResolvedValue([metric('metric-1', 'owner-1')]),
      },
    });

    await useCase.execute(input());

    expect(licenseConditionRepository.addMany).toHaveBeenCalledWith([
      expect.objectContaining({ esgMetricId: 'metric-1' }),
    ]);
  });

  it('looks up each distinct GRI parameter once, scoped to the license customer', async () => {
    const { useCase, esgMetricRepository, customerEsgMetricRepository } =
      buildUseCase();
    const batch = input();
    batch.conditions.push({ ...batch.conditions[0], name: 'Outra' });

    await useCase.execute(batch);

    expect(esgMetricRepository.findByIds).toHaveBeenCalledWith(['metric-1']);
    expect(
      customerEsgMetricRepository.findLinkedMetricIds,
    ).toHaveBeenCalledWith('customer-1', ['metric-1']);
  });

  it('rejects an unknown GRI parameter as not found', async () => {
    const { useCase, customerEsgMetricRepository, licenseConditionRepository } =
      buildUseCase({
        esgMetricRepository: { findByIds: jest.fn().mockResolvedValue([]) },
      });

    await expect(useCase.execute(input())).rejects.toThrow(
      ConditionCategoryNotFoundError,
    );
    expect(
      customerEsgMetricRepository.findLinkedMetricIds,
    ).not.toHaveBeenCalled();
    expect(licenseConditionRepository.addMany).not.toHaveBeenCalled();
  });

  it("treats another account's private GRI parameter as not found", async () => {
    const { useCase, customerEsgMetricRepository, licenseConditionRepository } =
      buildUseCase({
        esgMetricRepository: {
          findByIds: jest
            .fn()
            .mockResolvedValue([metric('metric-1', 'another-owner')]),
        },
        customerEsgMetricRepository: {
          findLinkedMetricIds: jest.fn().mockResolvedValue(['metric-1']),
        },
      });

    await expect(useCase.execute(input())).rejects.toThrow(
      ConditionCategoryNotFoundError,
    );
    expect(
      customerEsgMetricRepository.findLinkedMetricIds,
    ).not.toHaveBeenCalled();
    expect(licenseConditionRepository.addMany).not.toHaveBeenCalled();
  });

  it('rejects a GRI parameter that is not linked to the customer', async () => {
    const { useCase, licenseConditionRepository } = buildUseCase({
      customerEsgMetricRepository: {
        findLinkedMetricIds: jest.fn().mockResolvedValue([]),
      },
    });

    await expect(useCase.execute(input())).rejects.toThrow(
      ConditionCategoryNotLinkedError,
    );
    expect(licenseConditionRepository.addMany).not.toHaveBeenCalled();
  });

  it('does not query GRI parameters for a license owned by another account', async () => {
    const { useCase, esgMetricRepository } = buildUseCase({
      customerRepository: { findOne: jest.fn().mockResolvedValue(null) },
    });

    await expect(useCase.execute(input())).rejects.toThrow(
      LicenseNotFoundError,
    );
    expect(esgMetricRepository.findByIds).not.toHaveBeenCalled();
  });
});
