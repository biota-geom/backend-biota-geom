import { Injectable } from '@nestjs/common';
import { DocumentFolder } from './document-folder.entity';

export interface CreateDocumentFolderData {
  customerId: string;
  parentId: string | null;
  name: string;
}

@Injectable()
export abstract class DocumentFoldersRepository {
  abstract create(data: CreateDocumentFolderData): Promise<DocumentFolder>;
  abstract findAllByCustomerId(customerId: string): Promise<DocumentFolder[]>;
  abstract findByIdForOwner(
    id: string,
    customerId: string,
    ownerUserId: string,
  ): Promise<DocumentFolder | null>;
  abstract findByName(
    customerId: string,
    parentId: string | null,
    name: string,
  ): Promise<DocumentFolder | null>;
}
