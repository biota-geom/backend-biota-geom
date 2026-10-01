import { LicenseConditionStatus } from '@prisma/client';
import { AddLicenseConditionsUseCase } from '../application/add-license-conditions.use-case';
import { GetLicenseConditionsComplianceUseCase } from '../application/get-license-conditions-compliance.use-case';
import { ListLicenseConditionsByCustomerUseCase } from '../application/list-license-conditions-by-customer.use-case';
import { LicenseConditionRiskLevel } from '../domain/license-condition-risk-level';
import { LicenseConditionStatusFilter } from './dto/list-license-conditions-query.dto';
import { LicenseConditionsController } from './license-conditions.controller';

function buildController(overrides?: {
  listLicenseConditionsByCustomerUseCase?: unknown;
  addLicenseConditionsUseCase?: unknown;
  getLicenseConditionsComplianceUseCase?: unknown;
}): LicenseConditionsController {
  return new LicenseConditionsController(
    (overrides?.listLicenseConditionsByCustomerUseCase ??
      ({
        execute: jest.fn(),
      } as unknown)) as ListLicenseConditionsByCustomerUseCase,
    (overrides?.addLicenseConditionsUseCase ??
      ({ execute: jest.fn() } as unknown)) as AddLicenseConditionsUseCase,
    (overrides?.getLicenseConditionsComplianceUseCase ??
      ({
        execute: jest.fn(),
      } as unknown)) as GetLicenseConditionsComplianceUseCase,
  );
}

describe('LicenseConditionsController', () => {
  it('returns the compliance summary in the API contract shape', async () => {
    const execute = jest.fn().mockResolvedValue({
      totalActive: 8,
      inCompliance: 4,
      compliancePercentage: 50,
    });
    const controller = buildController({
      getLicenseConditionsComplianceUseCase: { execute },
    });

    const response = await controller.getLicenseConditionsCompliance(
      'customer-1',
      { id: 'owner-1' },
    );

    expect(execute).toHaveBeenCalledWith('customer-1', 'owner-1');
    expect(response).toEqual({
      total_active: 8,
      in_compliance: 4,
      compliance_percentage: 50,
    });
  });

  it('forwards the filter and maps the response', async () => {
    const execute = jest.fn().mockResolvedValue({
      total: 1,
      data: [
        {
          id: 'condition-1',
          licenseId: 'license-1',
          name: 'Automonitoramento Atmosférico',
          description: 'Avaliação periódica de emissões.',
          category: { id: 'metric-emissoes', name: 'Emissões' },
          responsibleAgency: 'FEPAM',
          dueDate: new Date('2026-02-11T00:00:00.000Z'),
          status: LicenseConditionStatus.REGULAR,
          riskLevel: LicenseConditionRiskLevel.RISK,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });
    const controller = buildController({
      listLicenseConditionsByCustomerUseCase: { execute },
    });

    const response = await controller.listLicenseConditions(
      'customer-1',
      { id: 'owner-1' },
      { status: LicenseConditionStatusFilter.RISK },
    );

    expect(execute).toHaveBeenCalledWith(
      'customer-1',
      'owner-1',
      LicenseConditionRiskLevel.RISK,
    );
    expect(response).toEqual({
      total: 1,
      data: [
        {
          id: 'condition-1',
          license_id: 'license-1',
          name: 'Automonitoramento Atmosférico',
          description: 'Avaliação periódica de emissões.',
          category: { id: 'metric-emissoes', name: 'Emissões' },
          responsible_agency: 'FEPAM',
          due_date: '2026-02-11T00:00:00.000Z',
          status: 'Regular',
          risk_level: LicenseConditionRiskLevel.RISK,
        },
      ],
    });
  });

  it('treats all status as an unfiltered request', async () => {
    const execute = jest.fn().mockResolvedValue({ total: 0, data: [] });
    const controller = buildController({
      listLicenseConditionsByCustomerUseCase: { execute },
    });

    await controller.listLicenseConditions(
      'customer-1',
      { id: 'owner-1' },
      { status: LicenseConditionStatusFilter.ALL },
    );

    expect(execute).toHaveBeenCalledWith('customer-1', 'owner-1', undefined);
  });

  it('wraps one condition in the shared batch use case and maps the created response', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const execute = jest.fn().mockResolvedValue([
      {
        id: 'condition-1',
        licenseId: 'license-1',
        name: 'MTR',
        category: { id: 'metric-residuos', name: 'Resíduos' },
        responsibleAgency: 'FEPAM',
        dueDate: new Date('2027-05-20T00:00:00.000Z'),
        status: LicenseConditionStatus.REGULAR,
        description: null,
        createdAt,
        updatedAt: createdAt,
      },
    ]);
    const controller = buildController({
      addLicenseConditionsUseCase: { execute },
    });

    const response = await controller.addLicenseCondition(
      'license-1',
      {
        name: 'MTR',
        esg_metric_id: 'metric-residuos',
        license_id: 'license-1',
        responsible_agency: 'FEPAM',
        due_date: '2027-05-20T00:00:00.000Z',
        status: undefined,
        description: '',
      },
      { id: 'owner-1' },
    );

    expect(execute).toHaveBeenCalledWith({
      licenseId: 'license-1',
      ownerUserId: 'owner-1',
      conditions: [
        {
          licenseId: 'license-1',
          name: 'MTR',
          esgMetricId: 'metric-residuos',
          responsibleAgency: 'FEPAM',
          dueDate: new Date('2027-05-20T00:00:00.000Z'),
          status: undefined,
          description: undefined,
        },
      ],
    });
    expect(response).toEqual({
      id: 'condition-1',
      license_id: 'license-1',
      name: 'MTR',
      category: { id: 'metric-residuos', name: 'Resíduos' },
      responsible_agency: 'FEPAM',
      due_date: '2027-05-20T00:00:00.000Z',
      status: 'Regular',
      description: null,
      created_at: '2026-01-01T00:00:00.000Z',
    });
  });
});
