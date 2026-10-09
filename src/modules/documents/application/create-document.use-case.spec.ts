import { CustomerDocumentType } from '../domain/customer-document-type';
import { FileStorage } from '../../../common/storage/file-storage';
import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { DocumentsRepository } from '../domain/documents.repository';
import { CreateDocumentUseCase } from './create-document.use-case';

const input = {
  customerId: 'customer-1',
  ownerUserId: 'user-1',
  title: 'Environmental report',
  type: CustomerDocumentType.LAUDO,
  documentDate: new Date('2026-08-15T00:00:00.000Z'),
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

  return {
    useCase: new CreateDocumentUseCase(repository, customers, storage),
    createDocument,
    findCustomer,
    upload,
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
      type: input.type,
      documentDate: input.documentDate,
      fileUrl: 'https://files/document.pdf',
      fileName: input.file.originalName,
      mimeType: input.file.mimeType,
      sizeBytes: input.file.size,
      uploadedById: input.ownerUserId,
    });
  });
});
