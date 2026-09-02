import { ApiProperty } from '@nestjs/swagger';

export class CustomerResponseDTO {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Unidade Industrial RS' })
  name!: string;

  @ApiProperty({ example: 'Ativo' })
  status!: string;

  @ApiProperty({ example: 'Siderurgia' })
  segment!: string;

  @ApiProperty({ example: 'Porto Alegre - RS' })
  location!: string;
}
