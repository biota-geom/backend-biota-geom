import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { DocumentFoldersRepository } from '../domain/document-folders.repository';
import { DocumentFolderAlreadyExistsError } from '../domain/errors/document-folder-already-exists.error';
import { DocumentFolderNotFoundError } from '../domain/errors/document-folder-not-found.error';
import { CreateDocumentFolderUseCase } from './create-document-folder.use-case';

function setup() {
  const findCustomer = jest.fn().mockResolvedValue({ id: 'customer-1' });
  const findByIdForOwner = jest.fn().mockResolvedValue({ id: 'parent-1' });
  const findByName = jest.fn().mockResolvedValue(null);
  const create = jest.fn().mockResolvedValue({ id: 'folder-1' });
  const useCase = new CreateDocumentFolderUseCase(
    {
      findByIdForOwner,
      findByName,
      create,
    } as unknown as DocumentFoldersRepository,
    { findOne: findCustomer } as unknown as CustomerRepository,
  );

  return { create, findByIdForOwner, findByName, findCustomer, useCase };
}

const input = {
  customerId: 'customer-1',
  ownerUserId: 'owner-1',
  parentId: 'parent-1',
  name: 'Licenças',
};

describe('CreateDocumentFolderUseCase', () => {
  it('creates a nested folder after checking the customer and parent', async () => {
    const { create, findByIdForOwner, findByName, useCase } = setup();

    await useCase.execute(input);

    expect(findByIdForOwner).toHaveBeenCalledWith(
      'parent-1',
      'customer-1',
      'owner-1',
    );
    expect(findByName).toHaveBeenCalledWith(
      'customer-1',
      'parent-1',
      'Licenças',
    );
    expect(create).toHaveBeenCalledWith({
      customerId: 'customer-1',
      parentId: 'parent-1',
      name: 'Licenças',
    });
  });

  it('rejects an inaccessible customer before reading folders', async () => {
    const { create, findByIdForOwner, findCustomer, useCase } = setup();
    findCustomer.mockResolvedValueOnce(null);

    await expect(useCase.execute(input)).rejects.toThrow(CustomerNotFoundError);
    expect(findByIdForOwner).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects an inaccessible parent folder', async () => {
    const { create, findByIdForOwner, useCase } = setup();
    findByIdForOwner.mockResolvedValueOnce(null);

    await expect(useCase.execute(input)).rejects.toThrow(
      DocumentFolderNotFoundError,
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a duplicate name in the same parent', async () => {
    const { create, findByName, useCase } = setup();
    findByName.mockResolvedValueOnce({ id: 'duplicate' });

    await expect(useCase.execute(input)).rejects.toThrow(
      DocumentFolderAlreadyExistsError,
    );
    expect(create).not.toHaveBeenCalled();
  });
});
