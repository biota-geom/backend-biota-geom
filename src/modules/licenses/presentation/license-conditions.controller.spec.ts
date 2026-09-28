import { DeleteLicenseConditionUseCase } from '../application/delete-license-condition.use-case';
import { ListLicenseConditionsByCustomerUseCase } from '../application/list-license-conditions-by-customer.use-case';
import { UpdateLicenseConditionUseCase } from '../application/update-license-condition.use-case';
import { LicenseConditionRiskLevel } from '../domain/license-condition-risk-level';
import { UpdateLicenseConditionDto } from './dto/update-license-condition.dto';
import { LicenseConditionsController } from './license-conditions.controller';

function buildController(overrides?: {
  listLicenseConditionsByCustomerUseCase?: unknown;
  updateLicenseConditionUseCase?: unknown;
  deleteLicenseConditionUseCase?: unknown;
}): LicenseConditionsController {
  return new LicenseConditionsController(
    (overrides?.listLicenseConditionsByCustomerUseCase ??
      ({
        execute: jest.fn(),
      } as unknown)) as ListLicenseConditionsByCustomerUseCase,
    (overrides?.updateLicenseConditionUseCase ??
      ({
        execute: jest.fn(),
      } as unknown)) as UpdateLicenseConditionUseCase,
    (overrides?.deleteLicenseConditionUseCase ??
      ({
        execute: jest.fn(),
      } as unknown)) as DeleteLicenseConditionUseCase,
  );
}

function buildBody(
  overrides: Partial<UpdateLicenseConditionDto> = {},
): UpdateLicenseConditionDto {
  return {
    title: 'MTR - Manifesto de Transporte de Resíduos',
    description: 'Emissão de manifesto obrigatório.',
    category: 'Resíduos',
    license_id: 'license-1',
    due_date: '2026-06-30T00:00:00.000Z',
    ...overrides,
  };
}

describe('LicenseConditionsController', () => {
  it('forwards the customer and authenticated user to the use case and maps the response', async () => {
    const execute = jest.fn().mockResolvedValue([
      {
        id: 'condition-1',
        licenseId: 'license-1',
        title: 'Automonitoramento Atmosférico',
        description: 'Avaliação periódica de emissões.',
        category: 'Emissões',
        dueDate: new Date('2026-02-11T00:00:00.000Z'),
        riskLevel: LicenseConditionRiskLevel.RISK,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const controller = buildController({
      listLicenseConditionsByCustomerUseCase: { execute },
    });

    const response = await controller.listLicenseConditions('customer-1', {
      id: 'owner-1',
    });

    expect(execute).toHaveBeenCalledWith('customer-1', 'owner-1');
    expect(response).toEqual([
      {
        id: 'condition-1',
        title: 'Automonitoramento Atmosférico',
        description: 'Avaliação periódica de emissões.',
        category: 'Emissões',
        license_id: 'license-1',
        due_date: '2026-02-11T00:00:00.000Z',
        risk_level: LicenseConditionRiskLevel.RISK,
      },
    ]);
  });

  it('translates the update body into the use case input and maps the response', async () => {
    const execute = jest.fn().mockResolvedValue({
      id: 'condition-1',
      licenseId: 'license-1',
      title: 'MTR - Manifesto de Transporte de Resíduos',
      description: 'Emissão de manifesto obrigatório.',
      category: 'Resíduos',
      dueDate: new Date('2026-06-30T00:00:00.000Z'),
      riskLevel: LicenseConditionRiskLevel.REGULAR,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const controller = buildController({
      updateLicenseConditionUseCase: { execute },
    });

    const response = await controller.updateLicenseCondition(
      'customer-1',
      'condition-1',
      buildBody(),
      { id: 'owner-1' },
    );

    expect(execute).toHaveBeenCalledWith(
      'condition-1',
      'customer-1',
      'owner-1',
      {
        licenseId: 'license-1',
        title: 'MTR - Manifesto de Transporte de Resíduos',
        description: 'Emissão de manifesto obrigatório.',
        category: 'Resíduos',
        dueDate: new Date('2026-06-30T00:00:00.000Z'),
      },
    );
    expect(response).toEqual({
      id: 'condition-1',
      title: 'MTR - Manifesto de Transporte de Resíduos',
      description: 'Emissão de manifesto obrigatório.',
      category: 'Resíduos',
      license_id: 'license-1',
      due_date: '2026-06-30T00:00:00.000Z',
      risk_level: LicenseConditionRiskLevel.REGULAR,
    });
  });

  it('forwards the condition, customer and authenticated user to the delete use case', async () => {
    const execute = jest.fn().mockResolvedValue(undefined);
    const controller = buildController({
      deleteLicenseConditionUseCase: { execute },
    });

    await expect(
      controller.deleteLicenseCondition('customer-1', 'condition-1', {
        id: 'owner-1',
      }),
    ).resolves.toBeUndefined();
    expect(execute).toHaveBeenCalledWith(
      'condition-1',
      'customer-1',
      'owner-1',
    );
  });
});
