import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { DocumentsRepository } from '../domain/documents.repository';
import { ListDocumentsUseCase } from './list-documents.use-case';

describe('ListDocumentsUseCase', () => {
  it('does not query documents when the customer is not owned', async () => {
    const findDocuments = jest.fn();
    const documents = {
      findActiveByCustomerId: findDocuments,
    } as unknown as DocumentsRepository;
    const customers = {
      findOne: jest.fn().mockResolvedValue(null),
    } as unknown as CustomerRepository;
    const useCase = new ListDocumentsUseCase(documents, customers);

    await expect(useCase.execute('customer-1', 'user-1')).rejects.toThrow(
      CustomerNotFoundError,
    );
    expect(findDocuments).not.toHaveBeenCalled();
  });

  it('lists active documents after checking ownership', async () => {
    const rows = [{ id: 'document-1' }];
    const findDocuments = jest.fn().mockResolvedValue(rows);
    const findCustomer = jest.fn().mockResolvedValue({ id: 'customer-1' });
    const documents = {
      findActiveByCustomerId: findDocuments,
    } as unknown as DocumentsRepository;
    const customers = {
      findOne: findCustomer,
    } as unknown as CustomerRepository;
    const useCase = new ListDocumentsUseCase(documents, customers);

    await expect(useCase.execute('customer-1', 'user-1')).resolves.toBe(rows);
    expect(findCustomer).toHaveBeenCalledWith('customer-1', 'user-1');
    expect(findDocuments).toHaveBeenCalledWith('customer-1');
  });
});
