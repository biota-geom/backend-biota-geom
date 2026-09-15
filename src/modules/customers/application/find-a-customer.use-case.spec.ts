import { CustomerRepository } from '../domain/customers.repository';
import { InMemoryCustomerRepository } from './__tests__/in-memory-customer.repository';
import { FindCustomerUseCase } from './find-a-customer.use-case';

const OWNER = 'owner-1';
const OTHER_OWNER = 'owner-2';

describe('FindCustomerUseCase', () => {
  it('maps the customer details for the dashboard header', async () => {
    const findOne = jest.fn().mockResolvedValue({
      id: 'customer-1',
      name: 'Unidade Industrial RS',
      document: '12345678000199',
      documentType: 'cnpj',
      isActive: true,
      sector: { id: 'sector-1', name: 'Siderurgia' },
      address: { city: 'Porto Alegre', state: 'RS' },
    });
    const useCase = new FindCustomerUseCase({
      findOne,
    } as unknown as CustomerRepository);

    await expect(useCase.findCustomer('customer-1', OWNER)).resolves.toEqual({
      id: 'customer-1',
      name: 'Unidade Industrial RS',
      document: '12345678000199',
      document_type: 'cnpj',
      status: 'active',
      sector: { id: 'sector-1', name: 'Siderurgia' },
      address: { city: 'Porto Alegre', state: 'RS' },
    });
    expect(findOne).toHaveBeenCalledWith('customer-1', OWNER);
  });

  it('returns null when the customer is not found', async () => {
    const findOne = jest.fn().mockResolvedValue(null);
    const useCase = new FindCustomerUseCase({
      findOne,
    } as unknown as CustomerRepository);

    await expect(useCase.findCustomer('missing-id', OWNER)).resolves.toBeNull();
  });

  /*
   * The caller turns null into 404, so a customer of another owner is reported
   * exactly like one that never existed — 403 would confirm the id is real.
   */
  it('returns null for a customer that belongs to another owner', async () => {
    const repository = new InMemoryCustomerRepository();
    const foreign = repository.add({ ownerUserId: OTHER_OWNER });
    const useCase = new FindCustomerUseCase(repository);

    await expect(useCase.findCustomer(foreign.id, OWNER)).resolves.toBeNull();
    await expect(
      useCase.findCustomer(foreign.id, OTHER_OWNER),
    ).resolves.not.toBeNull();
  });

  it('maps inactive customers without address or sector', async () => {
    const findOne = jest.fn().mockResolvedValue({
      id: 'customer-2',
      name: 'Unidade sem relacionamentos',
      document: '98765432000100',
      documentType: 'cnpj',
      isActive: false,
      address: null,
      sector: null,
    });
    const useCase = new FindCustomerUseCase({
      findOne,
    } as unknown as CustomerRepository);

    await expect(useCase.findCustomer('customer-2', OWNER)).resolves.toEqual({
      id: 'customer-2',
      name: 'Unidade sem relacionamentos',
      document: '98765432000100',
      document_type: 'cnpj',
      status: 'inactive',
      sector: { id: '', name: '' },
      address: { city: '', state: '' },
    });
    expect(findOne).toHaveBeenCalledWith('customer-2', OWNER);
  });
});
