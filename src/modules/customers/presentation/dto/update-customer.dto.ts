import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { UpdateCustomerAddressDto } from './update-customer-address.dto';

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class UpdateCustomerDto {
  @ApiPropertyOptional({ example: 'Siderurgia Sul Porto Alegre (Atualizada)' })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: '12345678000199' })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  document?: string;

  @ApiPropertyOptional({ example: 'cnpj' })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  document_type?: string;

  @ApiPropertyOptional({ example: 'contato@empresa.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID()
  sector_id?: string;

  @ApiPropertyOptional({ example: 'Novo Responsável' })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  responsible_name?: string;

  @ApiPropertyOptional({ example: 'novo@empresa.com' })
  @IsOptional()
  @IsEmail()
  responsible_email?: string;

  @ApiPropertyOptional({ example: '+55 51 99988-7766' })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  responsible_phone?: string;

  @ApiPropertyOptional({ type: UpdateCustomerAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateCustomerAddressDto)
  address?: UpdateCustomerAddressDto;

  @ApiProperty({
    type: [String],
    example: [
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440002',
    ],
    description:
      'Lista completa de IDs de indicadores ESG vinculados à empresa. Substitui todos os vínculos existentes.',
  })
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  esg_indicator_ids!: string[];
}
