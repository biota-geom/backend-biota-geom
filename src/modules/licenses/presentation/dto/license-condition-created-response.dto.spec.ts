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
        category: 'Resíduos',
        responsibleAgency: 'FEPAM',
        dueDate: null,
        status,
        description: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      } as never),
    ).toEqual(
      expect.objectContaining({
        status: label,
        due_date: null,
      }),
    );
  });
});
