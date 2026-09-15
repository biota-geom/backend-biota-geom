import { AddressType, DocumentType } from '@prisma/client';
import { SectorRepository } from '../../sectors/domain/sectors.repository';
import { CreateCustomerData } from '../domain/create-customer.data';
import { CustomerRepository } from '../domain/customers.repository';
import { CustomerAlreadyExistsError } from '../domain/errors/customer-already-exists.error';
import { SectorNotFoundError } from '../domain/errors/sector-not-found.error';
import { InMemoryCustomerRepository } from './__tests__/in-memory-customer.repository';
import { CreateCustomerUseCase } from './create-customer.use-case';

const OWNER = 'owner-1';
const OTHER_OWNER = 'owner-2';

function buildData(
  overrides: Partial<CreateCustomerData> = {},
): CreateCustomerData {
  return {
    ownerUserId: OWNER,
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

  it('persists the owner it was given, which the controller reads off the token', async () => {
    const repository = new InMemoryCustomerRepository();
    const sectorRepository: Pick<SectorRepository, 'existsById'> = {
      existsById: jest.fn().mockResolvedValue(true),
    };
    const useCase = new CreateCustomerUseCase(
      repository,
      sectorRepository as unknown as SectorRepository,
    );

    const customer = await useCase.createCustomer(
      buildData({ ownerUserId: OTHER_OWNER }),
    );

    expect(customer.ownerUserId).toBe(OTHER_OWNER);
    expect(repository.rows).toHaveLength(1);
    expect(repository.rows[0].ownerUserId).toBe(OTHER_OWNER);
  });

  describe('document uniqueness', () => {
    function buildUseCase() {
      const repository = new InMemoryCustomerRepository();
      const sectorRepository: Pick<SectorRepository, 'existsById'> = {
        existsById: jest.fn().mockResolvedValue(true),
      };

      return new CreateCustomerUseCase(
        repository,
        sectorRepository as unknown as SectorRepository,
      );
    }

    it('rejects a document the same owner already registered', async () => {
      const useCase = buildUseCase();
      await useCase.createCustomer(buildData({ document: '12345678000199' }));

      await expect(
        useCase.createCustomer(buildData({ document: '12345678000199' })),
      ).rejects.toBeInstanceOf(CustomerAlreadyExistsError);
    });

    /*
     * US01 scopes the duplicate check to the logged-in client's own portfolio:
     * two consultancies may legitimately serve the same company, and a global
     * 409 would also disclose that some other tenant holds that CNPJ.
     */
    it('accepts the same document under a different owner', async () => {
      const useCase = buildUseCase();
      await useCase.createCustomer(
        buildData({ ownerUserId: OWNER, document: '12345678000199' }),
      );

      const other = await useCase.createCustomer(
        buildData({ ownerUserId: OTHER_OWNER, document: '12345678000199' }),
      );

      expect(other.ownerUserId).toBe(OTHER_OWNER);
      expect(other.document).toBe('12345678000199');
    });
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
