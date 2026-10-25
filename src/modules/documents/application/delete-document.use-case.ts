import { Injectable } from '@nestjs/common';
import { DocumentNotFoundError } from '../domain/errors/document-not-found.error';
import { DocumentsRepository } from '../domain/documents.repository';

@Injectable()
export class DeleteDocumentUseCase {
  constructor(private readonly documentsRepository: DocumentsRepository) {}

  async execute(
    documentId: string,
    customerId: string,
    ownerUserId: string,
  ): Promise<void> {
    /*
     * findByIdForOwner already filters by the owning user and by deletedAt,
     * so a document from another tenant and one that was already removed are
     * both indistinguishable from one that never existed.
     */
    const document = await this.documentsRepository.findByIdForOwner(
      documentId,
      customerId,
      ownerUserId,
    );
    if (!document) throw new DocumentNotFoundError(documentId);

    await this.documentsRepository.softDelete(documentId, ownerUserId);
  }
}
