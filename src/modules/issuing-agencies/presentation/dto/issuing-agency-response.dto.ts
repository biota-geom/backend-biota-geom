import { ApiProperty } from '@nestjs/swagger';
import { IssuingAgency } from '../../domain/issuing-agency.entity';

export class IssuingAgencyResponseDTO {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Fundação Estadual de Proteção Ambiental' })
  name!: string;

  @ApiProperty({ example: 'FEPAM', nullable: true })
  acronym!: string | null;
}

export function toIssuingAgencyResponse(
  agency: IssuingAgency,
): IssuingAgencyResponseDTO {
  return {
    id: agency.id,
    name: agency.name,
    acronym: agency.acronym,
  };
}
