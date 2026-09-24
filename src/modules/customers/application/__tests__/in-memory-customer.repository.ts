import { DocumentType } from '@prisma/client';
import { CreateCustomerData } from '../../domain/create-customer.data';
import { Customer } from '../../domain/customer.entity';
import { CustomerListItem } from '../../domain/customer-list-item';
import { CustomerRepository } from '../../domain/customers.repository';
import { CustomerAlreadyExistsError } from '../../domain/errors/customer-already-exists.error';
import type { UpdateCustomerData } from '../../domain/update-customer.data';

/*
 * In-memory stand-in for PrismaCustomerRepository, used to exercise tenant
 * isolation through the use cases. It reproduces the two rules the real
 * implementation gets from the database:
 *   - every lookup is filtered by ownerUserId, so another owner's customer is
 *     simply absent (never "found but rejected");
 *   - (ownerUserId, document) is unique, not `document` on its own.
 */
export class InMemoryCustomerRepository extends CustomerRepository {
  readonly rows: Customer[] = [];
  private sequence = 0;

  add(overrides: Partial<Customer> & { ownerUserId: string }): Customer {
    this.sequence += 1;
    const customer: Customer = {
      id: `customer-${this.sequence}`,
      name: `Empresa ${this.sequence}`,
      document: `1234567800019${this.sequence}`,
      documentType: DocumentType.CNPJ,
      email: 'contato@empresa.com.br',
      ownerName: 'Responsável',
      ownerEmail: 'responsavel@empresa.com.br',
      ownerPhone: '+55 51 99999-0000',
      isActive: true,
      isDeleted: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      addressId: null,
      sectorId: null,
      ...overrides,
    };

    this.rows.push(customer);

    return customer;
  }

  findAll(ownerUserId: string): Promise<CustomerListItem[]> {
    return Promise.resolve(
      this.rows
        .filter((row) => row.ownerUserId === ownerUserId && !row.isDeleted)
        .map((row) => ({
          ...row,
          totalLicenses: 0,
          regularLicenses: 0,
        })),
    );
  }

  create(data: CreateCustomerData): Promise<Customer> {
    const duplicate = this.rows.some(
      (row) =>
        row.ownerUserId === data.ownerUserId && row.document === data.document,
    );

    if (duplicate) {
      return Promise.reject(new CustomerAlreadyExistsError(data.document));
    }

    return Promise.resolve(
      this.add({
        ownerUserId: data.ownerUserId,
        name: data.name,
        document: data.document,
        documentType: data.documentType,
        email: data.email,
        ownerName: data.ownerName,
        ownerEmail: data.ownerEmail,
        ownerPhone: data.ownerPhone,
        sectorId: data.sectorId,
      }),
    );
  }

  findById(id: string, ownerUserId: string): Promise<Customer | null> {
    return Promise.resolve(
      this.rows.find(
        (row) => row.id === id && row.ownerUserId === ownerUserId,
      ) ?? null,
    );
  }

  findOne(id: string, ownerUserId: string): Promise<Customer | null> {
    return Promise.resolve(
      this.rows.find(
        (row) =>
          row.id === id && row.ownerUserId === ownerUserId && !row.isDeleted,
      ) ?? null,
    );
  }

  async update(
    id: string,
    ownerUserId: string,
    data: UpdateCustomerData,
  ): Promise<Customer> {
    const current = await this.findById(id, ownerUserId);

    if (!current) {
      throw new Error(`Customer "${id}" is not owned by "${ownerUserId}"`);
    }

    Object.assign(current, {
      name: data.name ?? current.name,
      document: data.document ?? current.document,
    });

    return current;
  }

  async remove(id: string, ownerUserId: string): Promise<boolean> {
    const current = await this.findOne(id, ownerUserId);

    if (!current) {
      return false;
    }

    current.isDeleted = true;

    return true;
  }
}
