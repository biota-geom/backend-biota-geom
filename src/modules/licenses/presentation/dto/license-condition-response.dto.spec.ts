import { LicenseConditionRiskLevel } from '../../domain/license-condition-risk-level';
import { LicenseConditionStatus } from '@prisma/client';
import { toLicenseConditionResponse } from './license-condition-response.dto';

describe('toLicenseConditionResponse', () => {
  it('maps the domain condition to the API snake_case contract', () => {
    expect(
      toLicenseConditionResponse({
        id: 'condition-1',
        licenseId: 'license-1',
        name: 'Automonitoramento Atmosférico',
        description: 'Avaliação periódica de emissões.',
        category: { id: 'metric-emissoes', name: 'Emissões' },
        responsibleAgency: 'FEPAM',
        dueDate: new Date('2026-02-11T00:00:00.000Z'),
        status: LicenseConditionStatus.REGULAR,
        targetMetricId: null,
        targetOperator: null,
        targetValue: null,
        riskLevel: LicenseConditionRiskLevel.RISK,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    ).toEqual({
      id: 'condition-1',
      license_id: 'license-1',
      name: 'Automonitoramento Atmosférico',
      description: 'Avaliação periódica de emissões.',
      category: { id: 'metric-emissoes', name: 'Emissões' },
      responsible_agency: 'FEPAM',
      due_date: '2026-02-11T00:00:00.000Z',
      status: 'Regular',
      target_metric_id: null,
      target_operator: null,
      target_value: null,
      risk_level: LicenseConditionRiskLevel.RISK,
    });
  });
});
