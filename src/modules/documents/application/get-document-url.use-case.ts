import { Injectable } from '@nestjs/common';
import {
  FileAccessUrl,
  FileStorage,
} from '../../../common/storage/file-storage';
import { DocumentNotFoundError } from '../domain/errors/document-not-found.error';
import { DocumentsRepository } from '../domain/documents.repository';

@Injectable()
export class GetDocumentUrlUseCase {
  constructor(
    private readonly documentsRepository: DocumentsRepository,
    private readonly fileStorage: FileStorage,
  ) {}

  async execute(
    documentId: string,
    customerId: string,
    ownerUserId: string,
  ): Promise<FileAccessUrl> {
    const document = await this.documentsRepository.findByIdForOwner(
      documentId,
      customerId,
      ownerUserId,
    );
    if (!document) throw new DocumentNotFoundError(documentId);

    return this.fileStorage.getAccessUrl(document.fileUrl);
  }
}
