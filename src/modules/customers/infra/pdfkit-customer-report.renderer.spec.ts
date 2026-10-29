import { DocumentType } from '@prisma/client';
import { CustomerReport } from '../domain/customer-report';
import { PdfKitCustomerReportRenderer } from './pdfkit-customer-report.renderer';

const PDF_MAGIC = '%PDF-';

function buildReport(overrides: Partial<CustomerReport> = {}): CustomerReport {
  return {
    header: {
      companyName: 'Unidade Industrial RS',
      document: '12345678000199',
      documentType: DocumentType.CNPJ,
      segment: 'Siderurgia',
      generatedAt: new Date('2026-10-28T18:30:00.000Z'),
    },
    licenses: { active: 6, regular: 3, attention: 2, expired: 1 },
    conditions: {
      totalActive: 10,
      inCompliance: 7,
      compliancePercentage: 70,
      pending: 3,
    },
    esg: {
      referenceMonth: '2026-09',
      indicators: [
        {
          name: 'Consumo de Água',
          unit: 'm³',
          value: 1234.5,
          variationPercentage: 20,
        },
        {
          name: 'Resíduos Gerados',
          unit: 't',
          value: null,
          variationPercentage: null,
        },
      ],
    },
    ...overrides,
  };
}

describe('PdfKitCustomerReportRenderer', () => {
  const renderer = new PdfKitCustomerReportRenderer();

  it('produces a single-page PDF document', async () => {
    const content = await renderer.render(buildReport());

    expect(content.length).toBeGreaterThan(0);
    expect(content.subarray(0, PDF_MAGIC.length).toString()).toBe(PDF_MAGIC);
    // One /Type /Page object means the report did not spill onto a second page.
    expect(
      content.toString('latin1').match(/\/Type\s*\/Page[^s]/g),
    ).toHaveLength(1);
  });

  it('renders a company with no segment and no ESG indicators', async () => {
    const content = await renderer.render(
      buildReport({
        header: {
          ...buildReport().header,
          segment: null,
        },
        esg: { referenceMonth: null, indicators: [] },
      }),
    );

    expect(content.subarray(0, PDF_MAGIC.length).toString()).toBe(PDF_MAGIC);
  });

  it('renders more indicators than fit on one row', async () => {
    const indicator = {
      name: 'Consumo de Energia',
      unit: 'kWh',
      value: 10,
      variationPercentage: -5,
    };
    const content = await renderer.render(
      buildReport({
        esg: {
          referenceMonth: '2026-09',
          indicators: Array.from({ length: 6 }, () => indicator),
        },
      }),
    );

    expect(content.subarray(0, PDF_MAGIC.length).toString()).toBe(PDF_MAGIC);
  });

  it('renders a CPF company without tripping the CNPJ mask', async () => {
    const content = await renderer.render(
      buildReport({
        header: {
          ...buildReport().header,
          document: '12345678901',
          documentType: DocumentType.CPF,
        },
      }),
    );

    expect(content.subarray(0, PDF_MAGIC.length).toString()).toBe(PDF_MAGIC);
  });

  it('renders a document that does not match the expected length', async () => {
    const content = await renderer.render(
      buildReport({
        header: { ...buildReport().header, document: '123' },
      }),
    );

    expect(content.subarray(0, PDF_MAGIC.length).toString()).toBe(PDF_MAGIC);
  });
});
