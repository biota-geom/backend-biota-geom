import { CustomerAddress, DocumentType } from '@prisma/client';
import { Sector } from '../../sectors/domain/sector.entity';

export interface Customer {
  id: string;
  // The User (consultancy) that owns this company. Never taken from a request
  // body — it comes from the authenticated token.
  ownerUserId: string;
  name: string;
  document: string;
  documentType: DocumentType;
  email: string | null;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string | null;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  addressId: string | null;
  address?: CustomerAddress | null;
  sectorId: string | null;
  sector?: Sector | null;
}
