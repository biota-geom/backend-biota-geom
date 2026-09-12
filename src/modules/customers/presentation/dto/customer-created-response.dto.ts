import { ApiProperty } from '@nestjs/swagger';
import { AddressType, DocumentType } from '@prisma/client';
import { Customer } from '../../domain/customer.entity';

class CustomerAddressResponseDTO {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: AddressType })
  type!: AddressType;

  @ApiProperty({ example: 'Av. Assis Brasil' })
  street!: string;

  @ApiProperty({ example: '123' })
  number!: string;

  @ApiProperty({ example: 'Porto Alegre' })
  city!: string;

  @ApiProperty({ example: 'RS' })
  state!: string;

  @ApiProperty({ example: '91010-000' })
  postal_code!: string;

  @ApiProperty({ example: 'BR' })
  country_code!: string;
}

export class CustomerCreatedResponseDTO {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Unidade Industrial RS' })
  name!: string;

  @ApiProperty({ example: '12345678000199' })
  document!: string;

  @ApiProperty({ enum: DocumentType })
  document_type!: DocumentType;

  @ApiProperty({ example: 'contato@unidade.com.br' })
  email!: string;

  @ApiProperty({ example: 'Ana Silva' })
  owner_name!: string;

  @ApiProperty({ example: 'ana.silva@unidade.com.br' })
  owner_email!: string;

  @ApiProperty({ example: '+55 51 99999-0000' })
  owner_phone!: string;

  @ApiProperty({ example: true })
  is_active!: boolean;

  @ApiProperty({ format: 'uuid', nullable: true })
  sector_id!: string | null;

  @ApiProperty({ example: 'Agronegócio Sustentável', nullable: true })
  segment!: string | null;

  @ApiProperty({ type: CustomerAddressResponseDTO, nullable: true })
  address!: CustomerAddressResponseDTO | null;

  @ApiProperty({ format: 'date-time' })
  created_at!: string;
}

export function toCustomerCreatedResponse(
  customer: Customer,
): CustomerCreatedResponseDTO {
  return {
    id: customer.id,
    name: customer.name,
    document: customer.document,
    document_type: customer.documentType,
    email: customer.email,
    owner_name: customer.ownerName,
    owner_email: customer.ownerEmail,
    owner_phone: customer.ownerPhone,
    is_active: customer.isActive,
    sector_id: customer.sectorId,
    segment: customer.sector?.name ?? null,
    address: customer.address
      ? {
          id: customer.address.id,
          type: customer.address.type,
          street: customer.address.street,
          number: customer.address.number,
          city: customer.address.city,
          state: customer.address.state,
          postal_code: customer.address.postalCode,
          country_code: customer.address.countryCode,
        }
      : null,
    created_at: customer.createdAt.toISOString(),
  };
}
