import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { DocumentFolder } from '../domain/document-folder.entity';
import { DocumentFoldersRepository } from '../domain/document-folders.repository';

@Injectable()
export class ListDocumentFoldersUseCase {
  constructor(
    private readonly foldersRepository: DocumentFoldersRepository,
    private readonly customerRepository: CustomerRepository,
  ) {}

  async execute(
    customerId: string,
    ownerUserId: string,
  ): Promise<DocumentFolder[]> {
    const customer = await this.customerRepository.findOne(
      customerId,
      ownerUserId,
    );
    if (!customer) throw new CustomerNotFoundError(customerId);

    return this.foldersRepository.findAllByCustomerId(customerId);
  }
}
