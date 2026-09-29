import { Customer } from './customer.entity';

// A customer as shown in the portfolio list: the row itself plus aggregates
// computed by the query, so the list never needs one extra request per card.
export interface CustomerListItem extends Customer {
  totalLicenses: number;
  // Due dates of every condition across the customer's licenses, used for
  // the canonical compliance percentage (same formula as US21).
  licenseConditionDueDates: Date[];
}
