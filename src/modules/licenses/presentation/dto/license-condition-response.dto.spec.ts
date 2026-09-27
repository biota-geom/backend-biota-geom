import { LicenseConditionRiskLevel } from '../../domain/license-condition-risk-level';
import { toLicenseConditionResponse } from './license-condition-response.dto';

describe('toLicenseConditionResponse', () => {
  it('maps the domain condition to the API snake_case contract', () => {
    expect(
      toLicenseConditionResponse({
        id: 'condition-1',
        licenseId: 'license-1',
        title: 'Automonitoramento Atmosférico',
        description: 'Avaliação periódica de emissões.',
        category: 'Emissões',
        dueDate: new Date('2026-02-11T00:00:00.000Z'),
        riskLevel: LicenseConditionRiskLevel.RISK,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    ).toEqual({
      id: 'condition-1',
      title: 'Automonitoramento Atmosférico',
      description: 'Avaliação periódica de emissões.',
      category: 'Emissões',
      due_date: '2026-02-11T00:00:00.000Z',
      risk_level: LicenseConditionRiskLevel.RISK,
    });
  });
});
