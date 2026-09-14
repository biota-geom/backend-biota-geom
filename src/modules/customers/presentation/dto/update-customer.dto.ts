import { ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
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

  @ApiPropertyOptional({ enum: DocumentType, example: DocumentType.CNPJ })
  @IsOptional()
  @IsEnum(DocumentType)
  document_type?: DocumentType;

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
}
