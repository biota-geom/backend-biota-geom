import { LicenseStatus } from '@prisma/client';
import { License } from '../../domain/license.entity';
import { toLicensePanelResponse } from './license-panel-response.dto';

function buildLicense(overrides: Partial<License> = {}): License {
  return {
    id: 'license-1',
    customerId: 'customer-1',
    type: 'LP',
    processNumber: 'LP nº 482/2024',
    issuingAgency: 'FEPAM',
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
          type: 'LP',
          process_number: 'LP nº 482/2024',
          issuing_agency: 'FEPAM',
          issue_date: '2024-03-12T00:00:00.000Z',
          expiration_date: '2026-03-12T00:00:00.000Z',
          status: 'Regular',
          document_url: 'https://bucket.aws.com/licenses/lp-482-2024.pdf',
        },
      ],
    });
  });

  it('passes free-text type and issuing agency through untouched', () => {
    const result = toLicensePanelResponse({
      summary: { total: 1, regular: 1, attention: 0, expired: 0 },
      licenses: [
        buildLicense({
          type: 'LAO',
          issuingAgency: 'Secretaria Municipal do Meio Ambiente',
        }),
      ],
    });

    expect(result.licenses[0].type).toBe('LAO');
    expect(result.licenses[0].issuing_agency).toBe(
      'Secretaria Municipal do Meio Ambiente',
    );
  });

  it('exposes the document_url on each license item', () => {
    const result = toLicensePanelResponse({
      summary: { total: 1, regular: 1, attention: 0, expired: 0 },
      licenses: [buildLicense({ documentUrl: 'https://example.com/file.pdf' })],
    });

    expect(result.licenses[0].document_url).toBe(
      'https://example.com/file.pdf',
    );
  });
});
