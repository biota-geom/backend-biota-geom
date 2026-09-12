import { describe, expect, it, jest } from '@jest/globals';
import type { EsgMetricEntity } from '../../esg-metrics/domain/entities/esg-metric.entity';
import { EsgPillar } from '../../esg-metrics/domain/esg-pillar';
import { EsgMetricRepository } from '../../esg-metrics/domain/repositories/esg-metric.repository';
import type { Customer } from '../domain/customer.entity';
import { CustomerRepository } from '../domain/customers.repository';
import { CustomerNotFoundError } from '../domain/errors/customer-not-found.error';
import { InvalidEsgIndicatorIdsError } from '../domain/errors/invalid-esg-indicator-ids.error';
import type { UpdateCustomerData } from '../domain/update-customer.data';
import { UpdateCustomerUseCase } from './update-customer.use-case';

const CUSTOMER: Customer = {
  id: 'customer-1',
  name: 'Unidade Industrial RS',
  document: '12345678000199',
  documentType: 'cnpj',
  email: 'contato@empresa.com',
  ownerName: 'Responsável Original',
  ownerEmail: 'original@empresa.com',
  ownerPhone: '+55 51 90000-0000',
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  addressId: 'address-1',
  sectorId: 'sector-1',
};

function metric(id: string): EsgMetricEntity {
  return {
    id,
    name: `Metric ${id}`,
    unit: 'm3',
    pillar: EsgPillar.AMBIENTAL,
    customerId: null,
    griStandardId: null,
  };
}

class InMemoryCustomerRepository extends CustomerRepository {
  updateData?: { id: string; data: UpdateCustomerData };

  findAll(): Promise<Customer[]> {
    throw new Error('Not implemented');
  }

  findById = jest.fn((): Promise<Customer | null> => Promise.resolve(CUSTOMER));

  update(id: string, data: UpdateCustomerData): Promise<Customer> {
    this.updateData = { id, data };
    return Promise.resolve({
      ...CUSTOMER,
      name: data.name ?? CUSTOMER.name,
      esgIndicatorIds: data.esgIndicatorIds,
    });
  }
}

class InMemoryEsgMetricRepository extends EsgMetricRepository {
  existingIds = new Set<string>();

  create(): Promise<EsgMetricEntity> {
    throw new Error('Not implemented');
  }

  findVisibleToCustomer(): Promise<EsgMetricEntity[]> {
    throw new Error('Not implemented');
  }

  findByCustomerIdAndName(): Promise<EsgMetricEntity | null> {
    throw new Error('Not implemented');
  }

  findByIds = jest.fn((ids: string[]): Promise<EsgMetricEntity[]> =>
    Promise.resolve(
      ids.filter((id) => this.existingIds.has(id)).map((id) => metric(id)),
    ),
  );
}

describe('UpdateCustomerUseCase', () => {
  it('throws CustomerNotFoundError when the customer does not exist', async () => {
    const customerRepository = new InMemoryCustomerRepository();
    customerRepository.findById = jest.fn(() => Promise.resolve(null));
    const esgMetricRepository = new InMemoryEsgMetricRepository();
    const useCase = new UpdateCustomerUseCase(
      customerRepository,
      esgMetricRepository,
    );

    await expect(
      useCase.execute('missing-id', { esgIndicatorIds: [] }),
    ).rejects.toThrow(CustomerNotFoundError);
  });

  it('throws InvalidEsgIndicatorIdsError when an indicator id does not exist', async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const esgMetricRepository = new InMemoryEsgMetricRepository();
    esgMetricRepository.existingIds.add('metric-1');
    const useCase = new UpdateCustomerUseCase(
      customerRepository,
      esgMetricRepository,
    );

    await expect(
      useCase.execute('customer-1', {
        esgIndicatorIds: ['metric-1', 'missing-metric'],
      }),
    ).rejects.toThrow(InvalidEsgIndicatorIdsError);
  });

  it('updates the customer once existence and indicators are validated', async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const esgMetricRepository = new InMemoryEsgMetricRepository();
    esgMetricRepository.existingIds.add('metric-1');
    esgMetricRepository.existingIds.add('metric-2');
    const useCase = new UpdateCustomerUseCase(
      customerRepository,
      esgMetricRepository,
    );

    const data: UpdateCustomerData = {
      name: 'Empresa Atualizada',
      esgIndicatorIds: ['metric-1', 'metric-2'],
    };

    await expect(useCase.execute('customer-1', data)).resolves.toEqual(
      expect.objectContaining({ name: 'Empresa Atualizada' }),
    );
    expect(customerRepository.updateData).toEqual({
      id: 'customer-1',
      data,
    });
  });

  it('skips indicator validation when the list is empty', async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const esgMetricRepository = new InMemoryEsgMetricRepository();
    const useCase = new UpdateCustomerUseCase(
      customerRepository,
      esgMetricRepository,
    );

    await useCase.execute('customer-1', { esgIndicatorIds: [] });

    expect(esgMetricRepository.findByIds).not.toHaveBeenCalled();
  });
});
