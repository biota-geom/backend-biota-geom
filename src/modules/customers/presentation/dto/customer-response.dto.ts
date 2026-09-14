import { ApiProperty } from '@nestjs/swagger';

class SectorName {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Siderurgia' })
  name!: string;
}

class Address {
  @ApiProperty({ example: 'Porto Alegre' })
  city!: string;

  @ApiProperty({ example: 'RS' })
  state!: string;
}

export class CustomerResponseDTO {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Unidade Industrial RS' })
  name!: string;

  @ApiProperty({ example: '12345678000199' })
  document!: string;

  @ApiProperty({ example: 'cnpj' })
  document_type!: string;

  @ApiProperty({ example: 'Ativo' })
  status!: string;

  @ApiProperty({ type: SectorName })
  sector!: SectorName;

  @ApiProperty({ type: Address })
  address!: Address;
}
