import { LicenseStatus } from '@prisma/client';
import { License } from '../../domain/license.entity';
import { toLicenseRenewedResponse } from './license-renewed-response.dto';

function buildLicense(overrides: Partial<License> = {}): License {
  return {
    id: 'new-license',
    previousLicenseId: 'old-license',
    customerId: 'customer-1',
    type: 'LO',
    processNumber: 'LO nº 119/2026',
    issuingAgency: 'FEPAM',
    issueDate: new Date('2026-01-10T00:00:00.000Z'),
    expirationDate: new Date('2030-01-10T00:00:00.000Z'),
    status: LicenseStatus.REGULAR,
    documentUrl: 'https://bucket.aws.com/licenses/lo-119-2026.pdf',
    createdAt: new Date('2026-01-10T00:00:00.000Z'),
    updatedAt: new Date('2026-01-10T00:00:00.000Z'),
    ...overrides,
  };
}

describe('toLicenseRenewedResponse', () => {
  it.each([
    [LicenseStatus.REGULAR, 'Regular'],
    [LicenseStatus.ATTENTION, 'Atenção'],
    [LicenseStatus.EXPIRED, 'Vencida'],
  ])('maps status %s to the PT-BR label %s', (status, label) => {
    expect(toLicenseRenewedResponse(buildLicense({ status }))).toEqual(
      expect.objectContaining({ status: label }),
    );
  });

  it('maps the renewed license to the snake_case wire contract', () => {
    expect(toLicenseRenewedResponse(buildLicense())).toEqual({
      id: 'new-license',
      previous_license_id: 'old-license',
      status: 'Regular',
    });
  });

  it('falls back to an empty previous_license_id when the relation was not included', () => {
    expect(
      toLicenseRenewedResponse(buildLicense({ previousLicenseId: null })),
    ).toEqual(
      expect.objectContaining({
        previous_license_id: '',
      }),
    );
  });
});
