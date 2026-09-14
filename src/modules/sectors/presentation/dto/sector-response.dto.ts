import { ApiProperty } from '@nestjs/swagger';
import { Sector } from '../../domain/sector.entity';

export class SectorResponseDTO {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Agronegócio Sustentável' })
  name!: string;

  @ApiProperty({
    example: 'Setor focado em produção agrícola com práticas ecológicas.',
    nullable: true,
  })
  description!: string | null;
}

export function toSectorResponse(sector: Sector): SectorResponseDTO {
  return {
    id: sector.id,
    name: sector.name,
    description: sector.description,
  };
}
