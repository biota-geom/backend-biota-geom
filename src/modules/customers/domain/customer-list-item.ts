import { Customer } from './customer.entity';

export interface CustomerListItem extends Customer {
  totalLicenses: number;
  licenseExpirationDates: Date[];
}
