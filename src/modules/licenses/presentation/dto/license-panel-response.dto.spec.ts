import { LicenseStatus, LicenseType } from '@prisma/client';
import { License } from '../../domain/license.entity';
import { toLicensePanelResponse } from './license-panel-response.dto';

function buildLicense(overrides: Partial<License> = {}): License {
  return {
    id: 'license-1',
    customerId: 'customer-1',
    type: LicenseType.LP,
    processNumber: 'LP nº 482/2024',
    issuingAgencyId: 'agency-1',
    issuingAgency: {
      id: 'agency-1',
      name: 'FEPAM',
      acronym: 'FEPAM',
      createdAt: new Date(),
    },
    issueDate: new Date('2024-03-12T00:00:00.000Z'),
    expirationDate: new Date('2026-03-12T00:00:00.000Z'),
    status: LicenseStatus.REGULAR,
    documentUrl: 'https://bucket.aws.com/licenses/lp-482-2024.pdf',
    createdAt: new Date('2024-03-12T00:00:00.000Z'),
    updatedAt: new Date('2024-03-12T00:00:00.000Z'),
    ...overrides,
  };
}

describe('toLicensePanelResponse', () => {
  it('maps the summary through untouched and each license onto the wire shape', () => {
    const result = toLicensePanelResponse({
      summary: { total: 1, regular: 1, attention: 0, expired: 0 },
      licenses: [buildLicense()],
    });

    expect(result).toEqual({
      summary: { total: 1, regular: 1, attention: 0, expired: 0 },
      licenses: [
        {
          id: 'license-1',
          type: 'Licença Prévia (LP)',
          process_number: 'LP nº 482/2024',
          issuing_agency: 'FEPAM',
          issue_date: '2024-03-12T00:00:00.000Z',
          expiration_date: '2026-03-12T00:00:00.000Z',
          status: 'Regular',
        },
      ],
    });
  });

  it.each([
    [LicenseType.LP, 'Licença Prévia (LP)'],
    [LicenseType.LI, 'Licença de Instalação (LI)'],
    [LicenseType.LO, 'Licença de Operação (LO)'],
  ])('maps type %s to the PT-BR label %s', (type, label) => {
    const result = toLicensePanelResponse({
      summary: { total: 1, regular: 1, attention: 0, expired: 0 },
      licenses: [buildLicense({ type })],
    });

    expect(result.licenses[0].type).toBe(label);
  });

  it('falls back to null when the issuing agency was not included', () => {
    const result = toLicensePanelResponse({
      summary: { total: 1, regular: 1, attention: 0, expired: 0 },
      licenses: [buildLicense({ issuingAgency: undefined })],
    });

    expect(result.licenses[0].issuing_agency).toBeNull();
  });
});
