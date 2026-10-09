import { Injectable } from '@nestjs/common';
import { CreateDocumentData } from './create-document.data';
import { CustomerDocument } from './document.entity';

@Injectable()
export abstract class DocumentsRepository {
  abstract create(data: CreateDocumentData): Promise<CustomerDocument>;
  abstract findActiveByCustomerId(
    customerId: string,
  ): Promise<CustomerDocument[]>;
}
