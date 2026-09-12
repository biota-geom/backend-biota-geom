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
