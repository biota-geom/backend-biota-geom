import { describe, expect, it } from '@jest/globals';
import type { Customer } from '../../domain/customer.entity';
import { toCustomerDetailResponse } from './customer-detail-response.dto';

const BASE_CUSTOMER: Customer = {
  id: 'customer-1',
  name: 'Unidade Industrial RS',
  document: '12345678000199',
  documentType: 'cnpj',
  email: 'contato@empresa.com',
  ownerName: 'Responsável',
  ownerEmail: 'responsavel@empresa.com',
  ownerPhone: '+55 51 90000-0000',
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  addressId: 'address-1',
  sectorId: 'sector-1',
};

describe('toCustomerDetailResponse', () => {
  it('maps a customer with an address and indicators', () => {
    const customer: Customer = {
      ...BASE_CUSTOMER,
      address: {
        id: 'address-1',
        type: 'billing',
        street: 'Avenida das Palmeiras',
        number: '1000',
        city: 'Canoas',
        state: 'RS',
        postalCode: '90000-000',
        countryCode: 'BR',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      esgIndicatorIds: ['metric-1', 'metric-2'],
    };

    expect(toCustomerDetailResponse(customer)).toEqual({
      id: 'customer-1',
      name: 'Unidade Industrial RS',
      document: '12345678000199',
      document_type: 'cnpj',
      email: 'contato@empresa.com',
      responsible_name: 'Responsável',
      responsible_email: 'responsavel@empresa.com',
      responsible_phone: '+55 51 90000-0000',
      is_active: true,
      sector_id: 'sector-1',
      address: {
        type: 'billing',
        street: 'Avenida das Palmeiras',
        number: '1000',
        city: 'Canoas',
        state: 'RS',
        postal_code: '90000-000',
        country_code: 'BR',
      },
      esg_indicator_ids: ['metric-1', 'metric-2'],
    });
  });

  it('maps a customer without an address and without indicators', () => {
    const customer: Customer = { ...BASE_CUSTOMER, address: null };

    const result = toCustomerDetailResponse(customer);

    expect(result.address).toBeNull();
    expect(result.esg_indicator_ids).toEqual([]);
  });
});
