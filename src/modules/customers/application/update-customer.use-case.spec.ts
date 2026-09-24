import { describe, expect, it, jest } from '@jest/globals';
import { DocumentType } from '@prisma/client';
import type { Customer } from '../domain/customer.entity';
import type { CustomerListItem } from '../domain/customer-list-item';
import { CustomerRepository } from '../domain/customers.repository';
import { CustomerNotFoundError } from '../domain/errors/customer-not-found.error';
import type { UpdateCustomerData } from '../domain/update-customer.data';
import { InMemoryCustomerRepository } from './__tests__/in-memory-customer.repository';
import { UpdateCustomerUseCase } from './update-customer.use-case';

const OWNER = 'owner-1';
const OTHER_OWNER = 'owner-2';

const CUSTOMER: Customer = {
  id: 'customer-1',
  ownerUserId: OWNER,
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

class RecordingCustomerRepository extends CustomerRepository {
  updateData?: { id: string; ownerUserId: string; data: UpdateCustomerData };

  findAll(): Promise<CustomerListItem[]> {
    throw new Error('Not implemented');
  }

  create(): Promise<Customer> {
    throw new Error('Not implemented');
  }

  findById = jest.fn<CustomerRepository['findById']>(() =>
    Promise.resolve(CUSTOMER),
  );

  findOne(): Promise<Customer | null> {
    throw new Error('Not implemented');
  }

  update(
    id: string,
    ownerUserId: string,
    data: UpdateCustomerData,
  ): Promise<Customer> {
    this.updateData = { id, ownerUserId, data };
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
    const customerRepository = new RecordingCustomerRepository();
    customerRepository.findById = jest.fn<CustomerRepository['findById']>(() =>
      Promise.resolve(null),
    );
    const useCase = new UpdateCustomerUseCase(customerRepository);

    await expect(useCase.execute('missing-id', OWNER, {})).rejects.toThrow(
      CustomerNotFoundError,
    );
  });

  it('updates the customer once existence is validated', async () => {
    const customerRepository = new RecordingCustomerRepository();
    const useCase = new UpdateCustomerUseCase(customerRepository);

    const data: UpdateCustomerData = {
      name: 'Empresa Atualizada',
    };

    await expect(useCase.execute('customer-1', OWNER, data)).resolves.toEqual(
      expect.objectContaining({ name: 'Empresa Atualizada' }),
    );
    expect(customerRepository.findById).toHaveBeenCalledWith(
      'customer-1',
      OWNER,
    );
    expect(customerRepository.updateData).toEqual({
      id: 'customer-1',
      ownerUserId: OWNER,
      data,
    });
  });

  /*
   * Editing another client's company is reported as not found, not forbidden:
   * the scoped lookup cannot tell "does not exist" from "is not yours", and
   * must not — a 403 would confirm the id belongs to somebody.
   */
  it('refuses to update a customer owned by another account', async () => {
    const repository = new InMemoryCustomerRepository();
    const foreign = repository.add({
      ownerUserId: OTHER_OWNER,
      name: 'Empresa Alheia',
    });
    const useCase = new UpdateCustomerUseCase(repository);

    await expect(
      useCase.execute(foreign.id, OWNER, { name: 'Invadida' }),
    ).rejects.toThrow(CustomerNotFoundError);
    expect(foreign.name).toBe('Empresa Alheia');

    await expect(
      useCase.execute(foreign.id, OTHER_OWNER, { name: 'Renomeada' }),
    ).resolves.toEqual(expect.objectContaining({ name: 'Renomeada' }));
  });
});
