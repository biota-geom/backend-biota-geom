import { CustomerDocument } from '../domain/document.entity';
import { DocumentsRepository } from '../domain/documents.repository';
import { DocumentNotFoundError } from '../domain/errors/document-not-found.error';
import { DeleteDocumentUseCase } from './delete-document.use-case';

const DOCUMENT = { id: 'document-1' } as CustomerDocument;

function buildUseCase(overrides: {
  findByIdForOwner?: jest.Mock;
  softDelete?: jest.Mock;
}): {
  useCase: DeleteDocumentUseCase;
  findByIdForOwner: jest.Mock;
  softDelete: jest.Mock;
} {
  const findByIdForOwner =
    overrides.findByIdForOwner ?? jest.fn().mockResolvedValue(DOCUMENT);
  const softDelete = overrides.softDelete ?? jest.fn();
  const repository = {
    findByIdForOwner,
    softDelete,
  } as unknown as DocumentsRepository;

  return {
    useCase: new DeleteDocumentUseCase(repository),
    findByIdForOwner,
    softDelete,
  };
}

describe('DeleteDocumentUseCase', () => {
  it('marks the document as deleted by the current user', async () => {
    const { useCase, findByIdForOwner, softDelete } = buildUseCase({});

    await expect(
      useCase.execute('document-1', 'customer-1', 'user-1'),
    ).resolves.toBeUndefined();

    expect(findByIdForOwner).toHaveBeenCalledWith(
      'document-1',
      'customer-1',
      'user-1',
    );
    expect(softDelete).toHaveBeenCalledWith('document-1', 'user-1');
  });

  it('rejects a document the lookup does not return, without writing', async () => {
    const { useCase, softDelete } = buildUseCase({
      findByIdForOwner: jest.fn().mockResolvedValue(null),
    });

    await expect(
      useCase.execute('missing', 'customer-1', 'user-1'),
    ).rejects.toBeInstanceOf(DocumentNotFoundError);
    expect(softDelete).not.toHaveBeenCalled();
  });
});
