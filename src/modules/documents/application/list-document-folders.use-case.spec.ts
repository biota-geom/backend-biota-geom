import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { DocumentFoldersRepository } from '../domain/document-folders.repository';
import { ListDocumentFoldersUseCase } from './list-document-folders.use-case';

describe('ListDocumentFoldersUseCase', () => {
  it('does not query folders when the customer is not owned', async () => {
    const findFolders = jest.fn();
    const folders = {
      findAllByCustomerId: findFolders,
    } as unknown as DocumentFoldersRepository;
    const customers = {
      findOne: jest.fn().mockResolvedValue(null),
    } as unknown as CustomerRepository;
    const useCase = new ListDocumentFoldersUseCase(folders, customers);

    await expect(useCase.execute('customer-1', 'user-1')).rejects.toThrow(
      CustomerNotFoundError,
    );
    expect(findFolders).not.toHaveBeenCalled();
  });

  it('lists folders after checking customer ownership', async () => {
    const rows = [{ id: 'folder-1' }];
    const findFolders = jest.fn().mockResolvedValue(rows);
    const findCustomer = jest.fn().mockResolvedValue({ id: 'customer-1' });
    const folders = {
      findAllByCustomerId: findFolders,
    } as unknown as DocumentFoldersRepository;
    const customers = {
      findOne: findCustomer,
    } as unknown as CustomerRepository;
    const useCase = new ListDocumentFoldersUseCase(folders, customers);

    await expect(useCase.execute('customer-1', 'user-1')).resolves.toBe(rows);
    expect(findCustomer).toHaveBeenCalledWith('customer-1', 'user-1');
    expect(findFolders).toHaveBeenCalledWith('customer-1');
  });
});
