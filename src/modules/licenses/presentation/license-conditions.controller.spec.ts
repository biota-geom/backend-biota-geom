import { ListLicenseConditionsByCustomerUseCase } from '../application/list-license-conditions-by-customer.use-case';
import { LicenseConditionRiskLevel } from '../domain/license-condition-risk-level';
import { LicenseConditionsController } from './license-conditions.controller';

function buildController(overrides?: {
  listLicenseConditionsByCustomerUseCase?: unknown;
}): LicenseConditionsController {
  return new LicenseConditionsController(
    (overrides?.listLicenseConditionsByCustomerUseCase ??
      ({
        execute: jest.fn(),
      } as unknown)) as ListLicenseConditionsByCustomerUseCase,
  );
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
        due_date: '2026-02-11T00:00:00.000Z',
        risk_level: LicenseConditionRiskLevel.RISK,
      },
    ]);
  });
});
