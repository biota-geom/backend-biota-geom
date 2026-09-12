export type UpdateCustomerAddressData = {
  type?: string;
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
  documentType?: string;
  email?: string;
  sectorId?: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  address?: UpdateCustomerAddressData;
  esgIndicatorIds: string[];
};
