import { Injectable } from '@nestjs/common';
import { FileStorage, FileToStore } from '../../../common/storage/file-storage';
import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { CustomerDocument } from '../domain/document.entity';
import { DocumentsRepository } from '../domain/documents.repository';
import { DocumentFoldersRepository } from '../domain/document-folders.repository';
import { DocumentFolderNotFoundError } from '../domain/errors/document-folder-not-found.error';

export interface CreateDocumentInput {
  customerId: string;
  ownerUserId: string;
  title: string;
  documentDate: Date;
  folderId: string | null;
  file: FileToStore & { size: number };
}

@Injectable()
export class CreateDocumentUseCase {
  constructor(
    private readonly documentsRepository: DocumentsRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly fileStorage: FileStorage,
    private readonly foldersRepository: DocumentFoldersRepository,
  ) {}

  async execute(input: CreateDocumentInput): Promise<CustomerDocument> {
    const customer = await this.customerRepository.findOne(
      input.customerId,
      input.ownerUserId,
    );
    if (!customer) {
      throw new CustomerNotFoundError(input.customerId);
    }

    if (input.folderId) {
      const folder = await this.foldersRepository.findByIdForOwner(
        input.folderId,
        input.customerId,
        input.ownerUserId,
      );
      if (!folder) throw new DocumentFolderNotFoundError(input.folderId);
    }

    const { url } = await this.fileStorage.upload(input.file, {
      category: 'documents',
      customerId: input.customerId,
    });

    return this.documentsRepository.create({
      customerId: input.customerId,
      title: input.title,
      documentDate: input.documentDate,
      fileUrl: url,
      fileName: input.file.originalName,
      mimeType: input.file.mimeType,
      sizeBytes: input.file.size,
      uploadedById: input.ownerUserId,
      folderId: input.folderId,
    });
  }
}
