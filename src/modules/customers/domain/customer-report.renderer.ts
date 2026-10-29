import { Injectable } from '@nestjs/common';
import { CustomerReport } from './customer-report';

/*
 * Keeps the PDF library out of the use case: the application layer builds the
 * report data and asks for bytes, without knowing which renderer produces them.
 */
@Injectable()
export abstract class CustomerReportRenderer {
  abstract render(report: CustomerReport): Promise<Buffer>;
}
