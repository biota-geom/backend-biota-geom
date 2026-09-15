import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Customer } from '../../domain/customer.entity';

class CustomerAddressResponseDto {
  @ApiProperty({ example: 'billing' })
  type!: string;

  @ApiProperty({ example: 'Avenida das Palmeiras', nullable: true })
  street!: string | null;

  @ApiProperty({ example: '1000', nullable: true })
  number!: string | null;

  @ApiProperty({ example: 'Canoas' })
  city!: string;

  @ApiProperty({ example: 'RS' })
  state!: string;

  @ApiProperty({ example: '90000-000', nullable: true })
  postal_code!: string | null;

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

  @ApiProperty({ example: 'contato@empresa.com', nullable: true })
  email!: string | null;

  @ApiProperty({ example: 'Novo Responsável' })
  responsible_name!: string;

  @ApiProperty({ example: 'novo@empresa.com' })
  responsible_email!: string;

  @ApiProperty({ example: '+55 51 99988-7766', nullable: true })
  responsible_phone!: string | null;

  @ApiProperty()
  is_active!: boolean;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  sector_id!: string | null;

  @ApiPropertyOptional({ type: CustomerAddressResponseDto, nullable: true })
  address!: CustomerAddressResponseDto | null;
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
  };
}
