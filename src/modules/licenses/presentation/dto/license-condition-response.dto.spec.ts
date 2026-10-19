import { LicenseConditionStatus } from '@prisma/client';
import { LicenseConditionRiskLevel } from '../../domain/license-condition-risk-level';
import { toLicenseConditionResponse } from './license-condition-response.dto';

describe('toLicenseConditionResponse', () => {
  it('maps the descriptor and manual flags to snake_case', () => {
    expect(
      toLicenseConditionResponse({
        id: 'condition-1',
        licenseId: 'license-1',
        name: 'Automonitoramento Atmosférico',
        description: 'Avaliação periódica de emissões.',
        environmentalDescriptor: 'Emissões',
        responsibleAgency: 'FEPAM',
        dueDate: new Date('2026-02-11T00:00:00.000Z'),
        status: LicenseConditionStatus.REGULAR,
        hasDelivery: true,
        isViolated: true,
        riskLevel: LicenseConditionRiskLevel.RISK,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    ).toEqual(
      expect.objectContaining({
        environmental_descriptor: 'Emissões',
        has_delivery: true,
        is_violated: true,
      }),
    );
  });
});
