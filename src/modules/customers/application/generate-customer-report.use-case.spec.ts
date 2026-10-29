import { DocumentType } from '@prisma/client';
import { GetEsgIndicatorsSummaryUseCase } from '../../esg-indicators/application/get-esg-indicators-summary.use-case';
import { CustomerReport } from '../domain/customer-report';
import { CustomerRepository } from '../domain/customers.repository';
import { CustomerNotFoundError } from '../domain/errors/customer-not-found.error';
import { GenerateCustomerReportUseCase } from './generate-customer-report.use-case';
import { GetCustomerDashboardConditionsUseCase } from './get-customer-dashboard-conditions.use-case';
import { ListCustomerDashboardLicensesUseCase } from './list-customer-dashboard-licenses.use-case';

const CUSTOMER = {
  id: 'customer-1',
  name: 'Unidade Industrial RS',
  document: '12345678000199',
  documentType: DocumentType.CNPJ,
  sector: { name: 'Siderurgia' },
};

const LICENSES = {
  header: { active_licenses: 6, pending_items: 3 },
  counts: { regular: 3, pending: 2, expired: 1 },
  critical: [],
};

const CONDITIONS = {
  totalActive: 10,
  inCompliance: 7,
  compliancePercentage: 70,
  critical: [],
};

const ESG = {
  referenceMonth: '2026-09',
  indicators: [
    {
      id: 'indicator-1',
      name: 'Consumo de Água',
      unit: 'm³',
      category: 'AMBIENTAL',
      current: 120,
      previous: 100,
      variationPct: 20,
    },
  ],
};

function buildUseCase(
  overrides: {
    findOne?: jest.Mock;
    licenses?: jest.Mock;
    conditions?: jest.Mock;
    esg?: jest.Mock;
    render?: jest.Mock;
  } = {},
) {
  const findOne = overrides.findOne ?? jest.fn().mockResolvedValue(CUSTOMER);
  const licenses = overrides.licenses ?? jest.fn().mockResolvedValue(LICENSES);
  const conditions =
    overrides.conditions ?? jest.fn().mockResolvedValue(CONDITIONS);
  const esg = overrides.esg ?? jest.fn().mockResolvedValue(ESG);
  const render =
    overrides.render ?? jest.fn().mockResolvedValue(Buffer.from('%PDF'));

  const useCase = new GenerateCustomerReportUseCase(
    { findOne } as unknown as CustomerRepository,
    { execute: licenses } as unknown as ListCustomerDashboardLicensesUseCase,
    { execute: conditions } as unknown as GetCustomerDashboardConditionsUseCase,
    { execute: esg } as unknown as GetEsgIndicatorsSummaryUseCase,
    { render },
  );

  return { useCase, findOne, licenses, conditions, esg, render };
}

describe('GenerateCustomerReportUseCase', () => {
  it('builds the report from the same services the dashboard uses', async () => {
    const { useCase, licenses, conditions, esg, render } = buildUseCase();

    const result = await useCase.execute('customer-1', 'user-1');

    expect(licenses).toHaveBeenCalledWith('customer-1', 'user-1');
    expect(conditions).toHaveBeenCalledWith('customer-1', 'user-1');
    expect(esg).toHaveBeenCalledWith('customer-1', 'user-1');

    const [report] = render.mock.calls[0] as [CustomerReport];
    expect(report.header).toEqual(
      expect.objectContaining({
        companyName: 'Unidade Industrial RS',
        document: '12345678000199',
        documentType: DocumentType.CNPJ,
        segment: 'Siderurgia',
      }),
    );
    expect(report.licenses).toEqual({
      active: 6,
      regular: 3,
      attention: 2,
      expired: 1,
    });
    expect(result.content).toEqual(Buffer.from('%PDF'));
  });

  it('derives pending conditions from the compliance numbers', async () => {
    const { useCase, render } = buildUseCase();

    await useCase.execute('customer-1', 'user-1');

    const [report] = render.mock.calls[0] as [CustomerReport];
    expect(report.conditions).toEqual({
      totalActive: 10,
      inCompliance: 7,
      compliancePercentage: 70,
      pending: 3,
    });
  });

  it('maps the ESG summary onto the report indicators', async () => {
    const { useCase, render } = buildUseCase();

    await useCase.execute('customer-1', 'user-1');

    const [report] = render.mock.calls[0] as [CustomerReport];
    expect(report.esg).toEqual({
      referenceMonth: '2026-09',
      indicators: [
        {
          name: 'Consumo de Água',
          unit: 'm³',
          value: 120,
          variationPercentage: 20,
        },
      ],
    });
  });

  it('names the file after the company and the generation date', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute('customer-1', 'user-1');

    expect(result.fileName).toMatch(
      /^relatorio-unidade-industrial-rs-\d{4}-\d{2}-\d{2}\.pdf$/,
    );
  });

  it('falls back to zero when the dashboard DTO omits the counters', async () => {
    const { useCase, render } = buildUseCase({
      licenses: jest.fn().mockResolvedValue({}),
    });

    await useCase.execute('customer-1', 'user-1');

    const [report] = render.mock.calls[0] as [CustomerReport];
    expect(report.licenses).toEqual({
      active: 0,
      regular: 0,
      attention: 0,
      expired: 0,
    });
  });

  it('reports a company of another owner as not found, without rendering', async () => {
    const { useCase, render, licenses } = buildUseCase({
      findOne: jest.fn().mockResolvedValue(null),
    });

    await expect(
      useCase.execute('customer-1', 'other-user'),
    ).rejects.toBeInstanceOf(CustomerNotFoundError);
    expect(licenses).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
  });

  it('keeps the segment null when the company has no sector', async () => {
    const { useCase, render } = buildUseCase({
      findOne: jest.fn().mockResolvedValue({ ...CUSTOMER, sector: null }),
    });

    await useCase.execute('customer-1', 'user-1');

    const [report] = render.mock.calls[0] as [CustomerReport];
    expect(report.header.segment).toBeNull();
  });
});
