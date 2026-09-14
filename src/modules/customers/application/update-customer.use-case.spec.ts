import { describe, expect, it, jest } from '@jest/globals';
import { DocumentType } from '@prisma/client';
import type { Customer } from '../domain/customer.entity';
import { CustomerRepository } from '../domain/customers.repository';
import { CustomerNotFoundError } from '../domain/errors/customer-not-found.error';
import type { UpdateCustomerData } from '../domain/update-customer.data';
import { UpdateCustomerUseCase } from './update-customer.use-case';

const CUSTOMER: Customer = {
  id: 'customer-1',
  name: 'Unidade Industrial RS',
  document: '12345678000199',
  documentType: DocumentType.CNPJ,
  email: 'contato@empresa.com',
  ownerName: 'Responsável Original',
  ownerEmail: 'original@empresa.com',
  ownerPhone: '+55 51 90000-0000',
  isActive: true,
  isDeleted: false,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  addressId: 'address-1',
  sectorId: 'sector-1',
};

class InMemoryCustomerRepository extends CustomerRepository {
  updateData?: { id: string; data: UpdateCustomerData };

  findAll(): Promise<Customer[]> {
    throw new Error('Not implemented');
  }

  create(): Promise<Customer> {
    throw new Error('Not implemented');
  }

  findById = jest.fn((): Promise<Customer | null> => Promise.resolve(CUSTOMER));

  findOne(): Promise<Customer | null> {
    throw new Error('Not implemented');
  }

  update(id: string, data: UpdateCustomerData): Promise<Customer> {
    this.updateData = { id, data };
    return Promise.resolve({
      ...CUSTOMER,
      name: data.name ?? CUSTOMER.name,
    });
  }

  remove(): Promise<boolean> {
    throw new Error('Not implemented');
  }
}

describe('UpdateCustomerUseCase', () => {
  it('throws CustomerNotFoundError when the customer does not exist', async () => {
    const customerRepository = new InMemoryCustomerRepository();
    customerRepository.findById = jest.fn(() => Promise.resolve(null));
    const useCase = new UpdateCustomerUseCase(customerRepository);

    await expect(useCase.execute('missing-id', {})).rejects.toThrow(
      CustomerNotFoundError,
    );
  });

  it('updates the customer once existence is validated', async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const useCase = new UpdateCustomerUseCase(customerRepository);

    const data: UpdateCustomerData = {
      name: 'Empresa Atualizada',
    };

    await expect(useCase.execute('customer-1', data)).resolves.toEqual(
      expect.objectContaining({ name: 'Empresa Atualizada' }),
    );
    expect(customerRepository.updateData).toEqual({
      id: 'customer-1',
      data,
    });
  });
});
