import { Injectable } from '@nestjs/common';
import { GetEsgIndicatorsSummaryUseCase } from '../../esg-indicators/application/get-esg-indicators-summary.use-case';
import {
  CustomerReport,
  buildCustomerReportFileName,
} from '../domain/customer-report';
import { CustomerReportRenderer } from '../domain/customer-report.renderer';
import { CustomerRepository } from '../domain/customers.repository';
import { CustomerNotFoundError } from '../domain/errors/customer-not-found.error';
import { GetCustomerDashboardConditionsUseCase } from './get-customer-dashboard-conditions.use-case';
import { ListCustomerDashboardLicensesUseCase } from './list-customer-dashboard-licenses.use-case';

export interface GeneratedCustomerReport {
  fileName: string;
  content: Buffer;
}

@Injectable()
export class GenerateCustomerReportUseCase {
  constructor(
    private readonly customersRepository: CustomerRepository,
    private readonly listCustomerDashboardLicensesUseCase: ListCustomerDashboardLicensesUseCase,
    private readonly getCustomerDashboardConditionsUseCase: GetCustomerDashboardConditionsUseCase,
    private readonly getEsgIndicatorsSummaryUseCase: GetEsgIndicatorsSummaryUseCase,
    private readonly renderer: CustomerReportRenderer,
  ) {}

  async execute(
    customerId: string,
    ownerUserId: string,
  ): Promise<GeneratedCustomerReport> {
    const customer = await this.customersRepository.findOne(
      customerId,
      ownerUserId,
    );
    if (!customer) {
      throw new CustomerNotFoundError(customerId);
    }

    /*
     * The numbers come from the same use cases that feed the dashboard blocks,
     * never from fresh queries: that is what keeps the PDF and the screen
     * showing the same figures for the same moment.
     */
    const [licenses, conditions, esg] = await Promise.all([
      this.listCustomerDashboardLicensesUseCase.execute(
        customerId,
        ownerUserId,
      ),
      this.getCustomerDashboardConditionsUseCase.execute(
        customerId,
        ownerUserId,
      ),
      this.getEsgIndicatorsSummaryUseCase.execute(customerId, ownerUserId),
    ]);

    const generatedAt = new Date();
    const report: CustomerReport = {
      header: {
        companyName: customer.name,
        document: customer.document,
        documentType: customer.documentType,
        segment: customer.sector?.name ?? null,
        generatedAt,
      },
      /*
       * Every field of CustomerLicenseDetailsResponseDto is optional, so the
       * counters fall back to zero instead of printing "undefined" on the PDF.
       */
      licenses: {
        active: licenses.header?.active_licenses ?? 0,
        regular: licenses.counts?.regular ?? 0,
        attention: licenses.counts?.pending ?? 0,
        expired: licenses.counts?.expired ?? 0,
      },
      conditions: {
        totalActive: conditions.totalActive,
        inCompliance: conditions.inCompliance,
        compliancePercentage: conditions.compliancePercentage,
        pending: conditions.totalActive - conditions.inCompliance,
      },
      esg: {
        referenceMonth: esg.referenceMonth,
        indicators: esg.indicators.map((indicator) => ({
          name: indicator.name,
          unit: indicator.unit,
          value: indicator.current,
          variationPercentage: indicator.variationPct,
        })),
      },
    };

    return {
      fileName: buildCustomerReportFileName(customer.name, generatedAt),
      content: await this.renderer.render(report),
    };
  }
}
