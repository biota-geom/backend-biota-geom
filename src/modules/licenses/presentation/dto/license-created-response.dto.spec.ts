import { LicenseStatus, LicenseType } from '@prisma/client';
import { License } from '../../domain/license.entity';
import { toLicenseCreatedResponse } from './license-created-response.dto';

function buildLicense(overrides: Partial<License> = {}): License {
  return {
    id: 'license-1',
    customerId: 'customer-1',
    type: LicenseType.LO,
    processNumber: 'LO nº 118/2020',
    issuingAgencyId: 'agency-1',
    issuingAgency: {
      id: 'agency-1',
      name: 'FEPAM',
      acronym: 'FEPAM',
      createdAt: new Date(),
    },
    issueDate: new Date('2020-01-10T00:00:00.000Z'),
    expirationDate: new Date('2025-01-10T00:00:00.000Z'),
    status: LicenseStatus.EXPIRED,
    documentUrl: 'https://bucket.aws.com/licenses/lo-118-2020.pdf',
    createdAt: new Date('2020-01-10T00:00:00.000Z'),
    updatedAt: new Date('2020-01-10T00:00:00.000Z'),
    ...overrides,
  };
}

describe('toLicenseCreatedResponse', () => {
  it.each([
    [LicenseStatus.REGULAR, 'Regular'],
    [LicenseStatus.ATTENTION, 'Atenção'],
    [LicenseStatus.EXPIRED, 'Vencida'],
  ])('maps %s to the PT-BR label %s', (status, label) => {
    const response = toLicenseCreatedResponse(buildLicense({ status }));

    expect(response.status).toBe(label);
  });

  it('maps every field onto the wire shape', () => {
    const license = buildLicense();

    expect(toLicenseCreatedResponse(license)).toEqual({
      id: 'license-1',
      customer_id: 'customer-1',
      type: LicenseType.LO,
      process_number: 'LO nº 118/2020',
      issuing_agency_id: 'agency-1',
      issuing_agency_name: 'FEPAM',
      issue_date: '2020-01-10T00:00:00.000Z',
      expiration_date: '2025-01-10T00:00:00.000Z',
      status: 'Vencida',
      document_url: 'https://bucket.aws.com/licenses/lo-118-2020.pdf',
      created_at: '2020-01-10T00:00:00.000Z',
    });
  });

  it('falls back to null when the issuing agency was not included', () => {
    const response = toLicenseCreatedResponse(
      buildLicense({ issuingAgency: undefined }),
    );

    expect(response.issuing_agency_name).toBeNull();
  });
});
