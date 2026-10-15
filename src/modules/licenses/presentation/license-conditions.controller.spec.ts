import { ConditionStatus, LicenseConditionStatus } from '@prisma/client';
import { AddLicenseConditionsUseCase } from '../application/add-license-conditions.use-case';
import { GetLicenseConditionsComplianceUseCase } from '../application/get-license-conditions-compliance.use-case';
import { ListLicenseConditionsByCustomerUseCase } from '../application/list-license-conditions-by-customer.use-case';
import { UpdateLicenseConditionUseCase } from '../application/update-license-conditions.use-case';
import { LicenseConditionRiskLevel } from '../domain/license-condition-risk-level';
import { LicenseConditionStatusFilter } from './dto/list-license-conditions-query.dto';
import { LicenseConditionsController } from './license-conditions.controller';

function buildController(overrides?: {
  list?: unknown;
  add?: unknown;
  compliance?: unknown;
  update?: unknown;
}) {
  return new LicenseConditionsController(
    (overrides?.list ?? {
      execute: jest.fn(),
    }) as ListLicenseConditionsByCustomerUseCase,
    (overrides?.add ?? { execute: jest.fn() }) as AddLicenseConditionsUseCase,
    (overrides?.compliance ?? {
      execute: jest.fn(),
    }) as GetLicenseConditionsComplianceUseCase,
    (overrides?.update ?? {
      executeForOwner: jest.fn(),
    }) as UpdateLicenseConditionUseCase,
  );
}

const CONDITION = {
  id: 'condition-1',
  licenseId: 'license-1',
  name: 'MTR',
  environmentalDescriptor: 'Resíduos sólidos',
  responsibleAgency: 'FEPAM',
  dueDate: new Date('2027-05-20T00:00:00.000Z'),
  status: LicenseConditionStatus.REGULAR,
  hasDelivery: true,
  isViolated: false,
  description: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('LicenseConditionsController', () => {
  it('maps monitor conditions with descriptor and manual violation', async () => {
    const execute = jest.fn().mockResolvedValue({
      total: 1,
      data: [{ ...CONDITION, riskLevel: LicenseConditionRiskLevel.RISK }],
    });
    const controller = buildController({ list: { execute } });

    const response = await controller.listLicenseConditions(
      'customer-1',
      { id: 'owner-1' },
      { status: LicenseConditionStatusFilter.RISK },
    );

    expect(response.data[0]).toEqual(
      expect.objectContaining({
        environmental_descriptor: 'Resíduos sólidos',
        has_delivery: true,
        is_violated: false,
      }),
    );
  });

  it('creates a condition without GRI or compliance-target fields', async () => {
    const execute = jest.fn().mockResolvedValue([CONDITION]);
    const controller = buildController({ add: { execute } });

    await controller.addLicenseCondition(
      'license-1',
      {
        name: 'MTR',
        environmental_descriptor: 'Resíduos sólidos',
        license_id: 'license-1',
        responsible_agency: 'FEPAM',
        due_date: '2027-05-20T00:00:00.000Z',
        has_delivery: true,
      },
      { id: 'owner-1' },
    );

    expect(execute).toHaveBeenCalledWith({
      licenseId: 'license-1',
      ownerUserId: 'owner-1',
      conditions: [
        expect.objectContaining({
          environmentalDescriptor: 'Resíduos sólidos',
          hasDelivery: true,
        }),
      ],
    });
  });

  it('returns the compliance summary', async () => {
    const execute = jest.fn().mockResolvedValue({
      totalActive: 8,
      inCompliance: 4,
      compliancePercentage: 50,
    });
    const controller = buildController({ compliance: { execute } });

    await expect(
      controller.getLicenseConditionsCompliance('customer-1', {
        id: 'owner-1',
      }),
    ).resolves.toEqual({
      total_active: 8,
      in_compliance: 4,
      compliance_percentage: 50,
    });
  });

  it.each([
    [LicenseConditionStatusFilter.REGULAR, LicenseConditionRiskLevel.REGULAR],
    [
      LicenseConditionStatusFilter.ATTENTION,
      LicenseConditionRiskLevel.ATTENTION,
    ],
    [undefined, undefined],
  ])('maps the %s monitor filter', async (status, expectedRiskLevel) => {
    const execute = jest.fn().mockResolvedValue({ total: 0, data: [] });
    const controller = buildController({ list: { execute } });

    await controller.listLicenseConditions(
      'customer-1',
      { id: 'owner-1' },
      { status },
    );

    expect(execute).toHaveBeenCalledWith(
      'customer-1',
      'owner-1',
      expectedRiskLevel,
    );
  });

  it('updates the editable condition fields for the authenticated owner', async () => {
    const executeForOwner = jest.fn().mockResolvedValue({
      ...CONDITION,
      title: 'Updated condition',
      environmentalDescriptor: 'Waste',
      description: 'Updated description',
      responsibleName: null,
      conditionType: null,
      periodicity: null,
      deadline: null,
      dueDate: new Date('2027-06-20T00:00:00.000Z'),
      alertDate: null,
      completionDate: null,
      status: ConditionStatus.IN_PROGRESS,
      isViolated: true,
    });
    const controller = buildController({ update: { executeForOwner } });

    const response = await controller.updateLicenseCondition(
      'condition-1',
      {
        name: 'Updated condition',
        environmental_descriptor: 'Waste',
        description: 'Updated description',
        responsible_agency: 'FEPAM',
        due_date: '2027-06-20T00:00:00.000Z',
        has_delivery: false,
        is_violated: true,
      },
      { id: 'owner-1' },
    );

    expect(executeForOwner).toHaveBeenCalledWith('condition-1', 'owner-1', {
      title: 'Updated condition',
      environmentalDescriptor: 'Waste',
      description: 'Updated description',
      responsibleAgency: 'FEPAM',
      dueDate: new Date('2027-06-20T00:00:00.000Z'),
      hasDelivery: false,
      isViolated: true,
    });
    expect(response).toEqual(
      expect.objectContaining({
        name: 'Updated condition',
        environmental_descriptor: 'Waste',
        is_violated: true,
      }),
    );
  });

  it('keeps omitted fields undefined when updating a condition', async () => {
    const executeForOwner = jest.fn().mockResolvedValue({
      ...CONDITION,
      title: 'Condition',
      responsibleName: null,
      conditionType: null,
      periodicity: null,
      deadline: null,
      dueDate: null,
      alertDate: null,
      completionDate: null,
      status: ConditionStatus.IN_PROGRESS,
    });
    const controller = buildController({ update: { executeForOwner } });

    await controller.updateLicenseCondition(
      'condition-1',
      { title: 'Condition' },
      { id: 'owner-1' },
    );

    expect(executeForOwner).toHaveBeenCalledWith(
      'condition-1',
      'owner-1',
      expect.objectContaining({
        title: 'Condition',
        dueDate: undefined,
      }),
    );
  });
});
