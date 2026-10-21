import { FileStorage } from '../../../common/storage/file-storage';
import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { DocumentsRepository } from '../domain/documents.repository';
import { DocumentFoldersRepository } from '../domain/document-folders.repository';
import { DocumentFolderNotFoundError } from '../domain/errors/document-folder-not-found.error';
import { CreateDocumentUseCase } from './create-document.use-case';

const input = {
  customerId: 'customer-1',
  ownerUserId: 'user-1',
  title: 'Environmental report',
  documentDate: new Date('2026-08-15T00:00:00.000Z'),
  folderId: null,
  file: {
    buffer: Buffer.from('%PDF-1.7'),
    originalName: 'report.pdf',
    mimeType: 'application/pdf',
    size: 8,
  },
};

function setup(customer: object | null = { id: 'customer-1' }) {
  const createDocument = jest.fn().mockResolvedValue({ id: 'document-1' });
  const findCustomer = jest.fn().mockResolvedValue(customer);
  const upload = jest
    .fn()
    .mockResolvedValue({ url: 'https://files/document.pdf' });
  const repository = {
    create: createDocument,
  } as unknown as DocumentsRepository;
  const customers = {
    findOne: findCustomer,
  } as unknown as CustomerRepository;
  const storage = {
    upload,
  } as unknown as FileStorage;
  const findFolder = jest.fn().mockResolvedValue({ id: 'folder-1' });
  const folders = {
    findByIdForOwner: findFolder,
  } as unknown as DocumentFoldersRepository;

  return {
    useCase: new CreateDocumentUseCase(repository, customers, storage, folders),
    createDocument,
    findCustomer,
    upload,
    findFolder,
  };
}

describe('CreateDocumentUseCase', () => {
  it('checks ownership before storing anything', async () => {
    const { useCase, upload, createDocument } = setup(null);

    await expect(useCase.execute(input)).rejects.toThrow(CustomerNotFoundError);
    expect(upload).not.toHaveBeenCalled();
    expect(createDocument).not.toHaveBeenCalled();
  });

  it('stores the file and persists metadata derived from the request and token', async () => {
    const { useCase, upload, createDocument } = setup();

    await useCase.execute(input);

    expect(upload).toHaveBeenCalledWith(input.file, {
      category: 'documents',
      customerId: input.customerId,
    });
    expect(createDocument).toHaveBeenCalledWith({
      customerId: input.customerId,
      title: input.title,
      documentDate: input.documentDate,
      fileUrl: 'https://files/document.pdf',
      fileName: input.file.originalName,
      mimeType: input.file.mimeType,
      sizeBytes: input.file.size,
      uploadedById: input.ownerUserId,
      folderId: null,
    });
  });

  it('validates the selected folder before storing the file', async () => {
    const { useCase, findFolder, upload, createDocument } = setup();

    await useCase.execute({ ...input, folderId: 'folder-1' });

    expect(findFolder).toHaveBeenCalledWith('folder-1', 'customer-1', 'user-1');
    expect(upload).toHaveBeenCalledTimes(1);
    expect(createDocument).toHaveBeenCalledWith(
      expect.objectContaining({ folderId: 'folder-1' }),
    );
  });

  it('does not store a file when the selected folder is inaccessible', async () => {
    const { useCase, findFolder, upload, createDocument } = setup();
    findFolder.mockResolvedValueOnce(null);

    await expect(
      useCase.execute({ ...input, folderId: 'folder-1' }),
    ).rejects.toThrow(DocumentFolderNotFoundError);
    expect(upload).not.toHaveBeenCalled();
    expect(createDocument).not.toHaveBeenCalled();
  });
});
