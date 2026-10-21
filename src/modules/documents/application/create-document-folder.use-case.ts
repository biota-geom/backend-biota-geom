import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { DocumentFolder } from '../domain/document-folder.entity';
import { DocumentFoldersRepository } from '../domain/document-folders.repository';
import { DocumentFolderAlreadyExistsError } from '../domain/errors/document-folder-already-exists.error';
import { DocumentFolderNotFoundError } from '../domain/errors/document-folder-not-found.error';

export interface CreateDocumentFolderInput {
  customerId: string;
  ownerUserId: string;
  parentId: string | null;
  name: string;
}

@Injectable()
export class CreateDocumentFolderUseCase {
  constructor(
    private readonly foldersRepository: DocumentFoldersRepository,
    private readonly customerRepository: CustomerRepository,
  ) {}

  async execute(input: CreateDocumentFolderInput): Promise<DocumentFolder> {
    const customer = await this.customerRepository.findOne(
      input.customerId,
      input.ownerUserId,
    );
    if (!customer) throw new CustomerNotFoundError(input.customerId);

    if (input.parentId) {
      const parent = await this.foldersRepository.findByIdForOwner(
        input.parentId,
        input.customerId,
        input.ownerUserId,
      );
      if (!parent) throw new DocumentFolderNotFoundError(input.parentId);
    }

    const duplicate = await this.foldersRepository.findByName(
      input.customerId,
      input.parentId,
      input.name,
    );
    if (duplicate) throw new DocumentFolderAlreadyExistsError(input.name);

    return this.foldersRepository.create({
      customerId: input.customerId,
      parentId: input.parentId,
      name: input.name,
    });
  }
}
