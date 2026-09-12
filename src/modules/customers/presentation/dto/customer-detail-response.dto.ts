import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Customer } from '../../domain/customer.entity';

class CustomerAddressResponseDto {
  @ApiProperty({ example: 'billing' })
  type!: string;

  @ApiProperty({ example: 'Avenida das Palmeiras' })
  street!: string;

  @ApiProperty({ example: '1000' })
  number!: string;

  @ApiProperty({ example: 'Canoas' })
  city!: string;

  @ApiProperty({ example: 'RS' })
  state!: string;

  @ApiProperty({ example: '90000-000' })
  postal_code!: string;

  @ApiProperty({ example: 'BR' })
  country_code!: string;
}

export class CustomerDetailResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Siderurgia Sul Porto Alegre (Atualizada)' })
  name!: string;

  @ApiProperty({ example: '12345678000199' })
  document!: string;

  @ApiProperty({ example: 'cnpj' })
  document_type!: string;

  @ApiProperty({ example: 'contato@empresa.com' })
  email!: string;

  @ApiProperty({ example: 'Novo Responsável' })
  responsible_name!: string;

  @ApiProperty({ example: 'novo@empresa.com' })
  responsible_email!: string;

  @ApiProperty({ example: '+55 51 99988-7766' })
  responsible_phone!: string;

  @ApiProperty()
  is_active!: boolean;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  sector_id!: string | null;

  @ApiPropertyOptional({ type: CustomerAddressResponseDto, nullable: true })
  address!: CustomerAddressResponseDto | null;

  @ApiProperty({ type: [String] })
  esg_indicator_ids!: string[];
}

export function toCustomerDetailResponse(
  customer: Customer,
): CustomerDetailResponseDto {
  return {
    id: customer.id,
    name: customer.name,
    document: customer.document,
    document_type: customer.documentType,
    email: customer.email,
    responsible_name: customer.ownerName,
    responsible_email: customer.ownerEmail,
    responsible_phone: customer.ownerPhone,
    is_active: customer.isActive,
    sector_id: customer.sectorId,
    address: customer.address
      ? {
          type: customer.address.type,
          street: customer.address.street,
          number: customer.address.number,
          city: customer.address.city,
          state: customer.address.state,
          postal_code: customer.address.postalCode,
          country_code: customer.address.countryCode,
        }
      : null,
    esg_indicator_ids: customer.esgIndicatorIds ?? [],
  };
}
