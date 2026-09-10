import { CustomerAddress } from '@prisma/client';
import { Sector } from '../../sectors/domain/sector.entity';

export interface Customer {
  id: string;
  name: string;
  document: string;
  documentType: string;
  email: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  addressId: string | null;
  address?: CustomerAddress | null;
  sectorId: string | null;
  sector?: Sector | null;
}
