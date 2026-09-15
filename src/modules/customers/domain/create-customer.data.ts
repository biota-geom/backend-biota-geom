import { AddressType, DocumentType } from '@prisma/client';

export interface CreateCustomerAddressData {
  type: AddressType;
  street: string;
  number: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
}

export interface CreateCustomerData {
  /*
   * Owner of the new company, resolved from the authenticated token by the
   * controller. It is deliberately absent from CreateCustomerDto: a client
   * must not be able to register a company in another account's name.
   */
  ownerUserId: string;
  name: string;
  document: string;
  documentType: DocumentType;
  sectorId: string;
  email: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  address: CreateCustomerAddressData;
}
