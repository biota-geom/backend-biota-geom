import { Customer } from './customer.entity';

export interface CustumerAddress {
  id: string;
  type: string;
  street: string;
  number: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
  createdAt: Date;
  updatedAt: Date;
  customer?: Customer | null;
}
