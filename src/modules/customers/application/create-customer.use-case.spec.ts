import { AddressType, DocumentType } from '@prisma/client';
import { SectorRepository } from '../../sectors/domain/sectors.repository';
import { CreateCustomerData } from '../domain/create-customer.data';
import { CustomerRepository } from '../domain/customers.repository';
import { SectorNotFoundError } from '../domain/errors/sector-not-found.error';
import { CreateCustomerUseCase } from './create-customer.use-case';

function buildData(
  overrides: Partial<CreateCustomerData> = {},
): CreateCustomerData {
  return {
    name: 'Unidade Industrial RS',
    document: '12345678000199',
    documentType: DocumentType.CNPJ,
    sectorId: 'sector-1',
    email: 'contato@unidade.com.br',
    ownerName: 'Ana Silva',
    ownerEmail: 'ana.silva@unidade.com.br',
    ownerPhone: '+55 51 99999-0000',
    address: {
      type: AddressType.BILLING,
      street: 'Av. Assis Brasil',
      number: '123',
      city: 'Porto Alegre',
      state: 'RS',
      postalCode: '91010-000',
      countryCode: 'BR',
    },
    ...overrides,
  };
}

describe('CreateCustomerUseCase', () => {
  it('persists the customer when the sector exists', async () => {
    const created = { id: 'customer-1' };
    const repository: Pick<CustomerRepository, 'create'> = {
      create: jest.fn().mockResolvedValue(created),
    };
    const sectorRepository: Pick<SectorRepository, 'existsById'> = {
      existsById: jest.fn().mockResolvedValue(true),
    };
    const useCase = new CreateCustomerUseCase(
      repository as unknown as CustomerRepository,
      sectorRepository as unknown as SectorRepository,
    );
    const data = buildData();

    await expect(useCase.createCustomer(data)).resolves.toBe(created);
    expect(sectorRepository.existsById).toHaveBeenCalledWith('sector-1');
    expect(repository.create).toHaveBeenCalledWith(data);
  });

  it('rejects an unknown sector without touching the repository', async () => {
    const repository: Pick<CustomerRepository, 'create'> = {
      create: jest.fn(),
    };
    const sectorRepository: Pick<SectorRepository, 'existsById'> = {
      existsById: jest.fn().mockResolvedValue(false),
    };
    const useCase = new CreateCustomerUseCase(
      repository as unknown as CustomerRepository,
      sectorRepository as unknown as SectorRepository,
    );

    await expect(
      useCase.createCustomer(buildData({ sectorId: 'missing' })),
    ).rejects.toBeInstanceOf(SectorNotFoundError);
    expect(repository.create).not.toHaveBeenCalled();
  });
});
