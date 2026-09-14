import { AddressType, DocumentType } from '@prisma/client';

export type UpdateCustomerAddressData = {
  type?: AddressType;
  street?: string;
  number?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  countryCode?: string;
};

export type UpdateCustomerData = {
  name?: string;
  document?: string;
  documentType?: DocumentType;
  email?: string;
  sectorId?: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  address?: UpdateCustomerAddressData;
  esgIndicatorIds: string[];
};
