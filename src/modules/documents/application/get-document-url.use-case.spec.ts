import { FileStorage } from '../../../common/storage/file-storage';
import { CustomerDocument } from '../domain/document.entity';
import { DocumentNotFoundError } from '../domain/errors/document-not-found.error';
import { DocumentsRepository } from '../domain/documents.repository';
import { GetDocumentUrlUseCase } from './get-document-url.use-case';

function setup(document: CustomerDocument | null) {
  const findByIdForOwner = jest.fn().mockResolvedValue(document);
  const getAccessUrl = jest.fn().mockResolvedValue({
    url: 'https://signed.example/document.pdf',
    expiresInSeconds: 900,
  });
  const useCase = new GetDocumentUrlUseCase(
    { findByIdForOwner } as unknown as DocumentsRepository,
    { getAccessUrl } as unknown as FileStorage,
  );

  return { findByIdForOwner, getAccessUrl, useCase };
}

describe('GetDocumentUrlUseCase', () => {
  it('signs the stored URL after checking the customer and its owner', async () => {
    const document = {
      fileUrl: 'https://bucket.example/documents/customer-1/file.pdf',
    } as CustomerDocument;
    const { findByIdForOwner, getAccessUrl, useCase } = setup(document);

    await expect(
      useCase.execute('document-1', 'customer-1', 'owner-1'),
    ).resolves.toEqual({
      url: 'https://signed.example/document.pdf',
      expiresInSeconds: 900,
    });
    expect(findByIdForOwner).toHaveBeenCalledWith(
      'document-1',
      'customer-1',
      'owner-1',
    );
    expect(getAccessUrl).toHaveBeenCalledWith(document.fileUrl);
  });

  it('does not sign a missing, deleted, mismatched, or foreign document', async () => {
    const { getAccessUrl, useCase } = setup(null);

    await expect(
      useCase.execute('document-1', 'customer-1', 'owner-1'),
    ).rejects.toThrow(DocumentNotFoundError);
    expect(getAccessUrl).not.toHaveBeenCalled();
  });
});
