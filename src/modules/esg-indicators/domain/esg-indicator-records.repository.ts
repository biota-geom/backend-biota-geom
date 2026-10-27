import { Injectable } from '@nestjs/common';
import { IndicatorRecordChange } from './esg-indicator';

/*
 * The customer is assumed to be already checked against its owner (see
 * CustomerRepository), and the indicators against the customer's catalog:
 * the use cases do that before calling this port.
 */
@Injectable()
export abstract class EsgIndicatorRecordRepository {
  // Stored values of the month by indicator id; indicators without a record
  // are simply not in the map.
  abstract findValuesByMonth(
    customerId: string,
    referenceMonth: Date,
  ): Promise<Map<string, number>>;

  // The most recent month with a record of an indicator still linked to the
  // customer, or null when there is none.
  abstract findLatestMonth(customerId: string): Promise<Date | null>;

  /*
   * Applies every change in one transaction (all or nothing). Saving an
   * indicator that already has a record for the month corrects it; it never
   * adds a second one.
   */
  abstract saveMonth(
    customerId: string,
    referenceMonth: Date,
    changes: IndicatorRecordChange[],
  ): Promise<void>;
}
