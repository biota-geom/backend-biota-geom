import { LicenseConditionStatus } from '@prisma/client';
import { toLicenseConditionCreatedResponse } from './license-condition-created-response.dto';

describe('toLicenseConditionCreatedResponse', () => {
  it.each([
    [LicenseConditionStatus.REGULAR, 'Regular'],
    [LicenseConditionStatus.ATTENTION, 'Atenção'],
    [LicenseConditionStatus.RISK, 'Risco'],
  ])('maps status %s', (status, label) => {
    expect(
      toLicenseConditionCreatedResponse({
        id: 'condition-1',
        licenseId: 'license-1',
        name: 'MTR',
        environmentalDescriptor: 'Resíduos sólidos',
        responsibleAgency: 'FEPAM',
        dueDate: new Date('2026-06-01T00:00:00.000Z'),
        status,
        description: null,
        hasDelivery: true,
        isViolated: false,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    ).toEqual(
      expect.objectContaining({
        status: label,
        environmental_descriptor: 'Resíduos sólidos',
        has_delivery: true,
        is_violated: false,
      }),
    );
  });
});
