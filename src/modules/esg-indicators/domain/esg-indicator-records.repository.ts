import { Injectable } from '@nestjs/common';
import { EsgIndicatorChanges, EsgIndicatorValues } from './esg-indicator';

/*
 * The customer is assumed to be already checked against its owner (see
 * CustomerRepository): the use cases do that before calling this port.
 */
@Injectable()
export abstract class EsgIndicatorRecordRepository {
  abstract findByMonth(
    customerId: string,
    referenceMonth: Date,
  ): Promise<EsgIndicatorValues>;

  /*
   * Applies every change of the month in one transaction (all or nothing)
   * and returns the month as it is stored afterwards. Saving a month that
   * already has a record corrects it; it never adds a second one.
   */
  abstract saveMonth(
    customerId: string,
    referenceMonth: Date,
    changes: EsgIndicatorChanges,
  ): Promise<EsgIndicatorValues>;
}
