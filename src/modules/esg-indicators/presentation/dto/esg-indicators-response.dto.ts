import { ApiProperty } from '@nestjs/swagger';
import {
  EsgIndicatorChanges,
  EsgIndicatorValues,
} from '../../domain/esg-indicator';
import { SaveEsgIndicatorsDto } from './save-esg-indicators.dto';

export class EsgIndicatorsResponseDto {
  @ApiProperty({ type: Number, nullable: true, example: 1250.5 })
  water!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 12.3 })
  waste!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 148 })
  employees!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 53200 })
  energy!: number | null;
}

export function toEsgIndicatorsResponse(
  values: EsgIndicatorValues,
): EsgIndicatorsResponseDto {
  return {
    water: values.WATER,
    waste: values.WASTE,
    employees: values.EMPLOYEES,
    energy: values.ENERGY,
  };
}

export function toEsgIndicatorChanges(
  dto: SaveEsgIndicatorsDto,
): EsgIndicatorChanges {
  return {
    WATER: dto.water,
    WASTE: dto.waste,
    EMPLOYEES: dto.employees,
    ENERGY: dto.energy,
  };
}
