import { buildCustomerReportFileName } from './customer-report';

const GENERATED_AT = new Date('2026-10-28T18:30:00.000Z');

describe('buildCustomerReportFileName', () => {
  it('follows relatorio-<empresa>-<AAAA-MM-DD>.pdf', () => {
    expect(
      buildCustomerReportFileName('Unidade Industrial RS', GENERATED_AT),
    ).toBe('relatorio-unidade-industrial-rs-2026-10-28.pdf');
  });

  it('strips accents and punctuation the file system would rather not see', () => {
    expect(
      buildCustomerReportFileName('EcoVerde Agroindústria S.A.', GENERATED_AT),
    ).toBe('relatorio-ecoverde-agroindustria-s-a-2026-10-28.pdf');
  });

  it('collapses separators instead of leaving them doubled or trailing', () => {
    expect(
      buildCustomerReportFileName('  Metal / Aço  --  Ltda  ', GENERATED_AT),
    ).toBe('relatorio-metal-aco-ltda-2026-10-28.pdf');
  });

  it('falls back to a generic slug when the name has nothing usable', () => {
    expect(buildCustomerReportFileName('***', GENERATED_AT)).toBe(
      'relatorio-empresa-2026-10-28.pdf',
    );
  });
});
