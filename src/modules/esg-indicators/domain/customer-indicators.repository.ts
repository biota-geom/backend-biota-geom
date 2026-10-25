import { Injectable } from '@nestjs/common';
import { IndicatorDefinition, NewIndicator } from './esg-indicator';

/*
 * The indicators a customer reports are the catalog entries (esg_metric)
 * linked to it (customer_esg_metrics). As in EsgIndicatorRecordRepository,
 * the customer is checked against its owner by the use cases.
 */
@Injectable()
export abstract class CustomerIndicatorRepository {
  // Every indicator linked to the customer, ordered by category and name.
  abstract findActive(customerId: string): Promise<IndicatorDefinition[]>;

  // A catalog entry the owner can use (global or the owner's own) by name,
  // ignoring upper/lower case.
  abstract findInCatalogByName(
    ownerUserId: string,
    name: string,
  ): Promise<IndicatorDefinition | null>;

  abstract link(customerId: string, indicatorId: string): Promise<void>;

  // Creates the catalog entry (owned by the account) and links it to the
  // customer in one transaction.
  abstract createAndLink(
    customerId: string,
    ownerUserId: string,
    data: NewIndicator,
  ): Promise<IndicatorDefinition>;
}
