import { LicenseConditionStatus } from '@prisma/client';
import { LicenseConditionRiskLevel } from '../../licenses/domain/license-condition-risk-level';
import { LicenseCondition } from '../../licenses/domain/license-condition.entity';
import { GetLicenseConditionsComplianceUseCase } from '../../licenses/application/get-license-conditions-compliance.use-case';
import { ListLicenseConditionsByCustomerUseCase } from '../../licenses/application/list-license-conditions-by-customer.use-case';
import { GetCustomerDashboardConditionsUseCase } from './get-customer-dashboard-conditions.use-case';

function buildCondition(
  id: string,
  dueDate: Date,
  riskLevel: LicenseConditionRiskLevel,
): LicenseCondition & { riskLevel: LicenseConditionRiskLevel } {
  return {
    id,
    licenseId: 'license-1',
    name: `Condition ${id}`,
    description: null,
    environmentalDescriptor: 'Emissions',
    responsibleAgency: null,
    dueDate,
    status: LicenseConditionStatus.REGULAR,
    hasDelivery: false,
    isViolated: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    riskLevel,
  };
}

describe('GetCustomerDashboardConditionsUseCase', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns compliance and up to three critical conditions in risk and due-date order', async () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);
    const conditions = [
      buildCondition(
        'risk-nearest',
        new Date('2026-01-02T00:00:00.000Z'),
        LicenseConditionRiskLevel.RISK,
      ),
      buildCondition(
        'risk-later',
        new Date('2026-01-05T00:00:00.000Z'),
        LicenseConditionRiskLevel.RISK,
      ),
      buildCondition(
        'attention-nearest',
        new Date('2026-01-15T00:00:00.000Z'),
        LicenseConditionRiskLevel.ATTENTION,
      ),
      buildCondition(
        'attention-later',
        new Date('2026-01-25T00:00:00.000Z'),
        LicenseConditionRiskLevel.ATTENTION,
      ),
      buildCondition(
        'regular',
        new Date('2026-02-15T00:00:00.000Z'),
        LicenseConditionRiskLevel.REGULAR,
      ),
    ];
    const listConditions = {
      execute: jest.fn().mockResolvedValue({
        total: conditions.length,
        data: conditions,
      }),
    };
    const getCompliance = {
      execute: jest.fn().mockResolvedValue({
        totalActive: 5,
        inCompliance: 1,
        compliancePercentage: 20,
      }),
    };
    const useCase = new GetCustomerDashboardConditionsUseCase(
      listConditions as unknown as ListLicenseConditionsByCustomerUseCase,
      getCompliance as unknown as GetLicenseConditionsComplianceUseCase,
    );

    await expect(useCase.execute('customer-1', 'owner-1')).resolves.toEqual({
      totalActive: 5,
      inCompliance: 1,
      compliancePercentage: 20,
      critical: conditions.slice(0, 3),
    });
    expect(listConditions.execute).toHaveBeenCalledWith(
      'customer-1',
      'owner-1',
      undefined,
      now,
    );
    expect(getCompliance.execute).toHaveBeenCalledWith(
      'customer-1',
      'owner-1',
      now,
    );
  });

  it('returns 100% compliance and no critical conditions for an empty list', async () => {
    const listConditions = {
      execute: jest.fn().mockResolvedValue({ total: 0, data: [] }),
    };
    const getCompliance = {
      execute: jest.fn().mockResolvedValue({
        totalActive: 0,
        inCompliance: 0,
        compliancePercentage: 100,
      }),
    };
    const useCase = new GetCustomerDashboardConditionsUseCase(
      listConditions as unknown as ListLicenseConditionsByCustomerUseCase,
      getCompliance as unknown as GetLicenseConditionsComplianceUseCase,
    );

    await expect(useCase.execute('customer-1', 'owner-1')).resolves.toEqual({
      totalActive: 0,
      inCompliance: 0,
      compliancePercentage: 100,
      critical: [],
    });
  });

  it('propagates customer ownership errors from the license use case', async () => {
    const error = new Error('Customer not found');
    const listConditions = {
      execute: jest.fn().mockRejectedValue(error),
    };
    const getCompliance = {
      execute: jest.fn().mockResolvedValue({
        totalActive: 0,
        inCompliance: 0,
        compliancePercentage: 100,
      }),
    };
    const useCase = new GetCustomerDashboardConditionsUseCase(
      listConditions as unknown as ListLicenseConditionsByCustomerUseCase,
      getCompliance as unknown as GetLicenseConditionsComplianceUseCase,
    );

    await expect(useCase.execute('customer-1', 'owner-2')).rejects.toBe(error);
  });
});
