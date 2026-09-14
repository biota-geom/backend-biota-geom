import { ApiProperty } from '@nestjs/swagger';
import { AddressType, DocumentType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsDefined,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

/*
 * The form sends the document masked (12.345.678/0001-99) but the column holds
 * digits only, so the unique index compares like against like. Stripping here
 * rather than in the use case keeps format concerns in the HTTP layer.
 */
function stripNonDigits({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.replace(/\D/g, '') : value;
}

export class CreateCustomerAddressDto {
  @ApiProperty({ enum: AddressType, example: AddressType.BILLING })
  @IsEnum(AddressType)
  type!: AddressType;

  @ApiProperty({ example: 'Av. Assis Brasil' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  street!: string;

  @ApiProperty({ example: '123' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  number!: string;

  @ApiProperty({ example: 'Porto Alegre' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city!: string;

  @ApiProperty({ example: 'RS' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  state!: string;

  @ApiProperty({ example: '91010-000' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  postal_code!: string;

  @ApiProperty({ example: 'BR' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  country_code!: string;
}

export class CreateCustomerDto {
  @ApiProperty({ example: 'Unidade Industrial RS' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    example: '12345678000199',
    description: 'Aceita com ou sem máscara; é gravado somente com dígitos.',
  })
  @Transform(stripNonDigits)
  @IsString()
  @IsNotEmpty()
  @MaxLength(14)
  document!: string;

  @ApiProperty({ enum: DocumentType, example: DocumentType.CNPJ })
  @IsEnum(DocumentType)
  document_type!: DocumentType;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sector_id!: string;

  @ApiProperty({ example: 'contato@unidade.com.br' })
  @Transform(trimString)
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'Ana Silva' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  owner_name!: string;

  @ApiProperty({ example: 'ana.silva@unidade.com.br' })
  @Transform(trimString)
  @IsEmail()
  @MaxLength(255)
  owner_email!: string;

  @ApiProperty({ example: '+55 51 99999-0000' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  owner_phone!: string;

  /*
   * @ValidateNested alone passes a payload with no address at all — it only
   * walks a value that exists. @IsDefined/@IsObject are what make it required,
   * so the controller never dereferences an undefined address.
   */
  @ApiProperty({ type: CreateCustomerAddressDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => CreateCustomerAddressDto)
  address!: CreateCustomerAddressDto;
}
