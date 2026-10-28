import { Injectable } from '@nestjs/common';
import { CreateDocumentData } from './create-document.data';
import { CustomerDocument } from './document.entity';

@Injectable()
export abstract class DocumentsRepository {
  abstract create(data: CreateDocumentData): Promise<CustomerDocument>;
  abstract findByIdForOwner(
    id: string,
    customerId: string,
    ownerUserId: string,
  ): Promise<CustomerDocument | null>;
  abstract findActiveByCustomerId(
    customerId: string,
  ): Promise<CustomerDocument[]>;
  abstract softDelete(id: string, deletedById: string): Promise<void>;
}
