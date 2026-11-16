import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { LegislationInputDto, trimToNull } from './legislation-input.dto';

/** Send `legislation_id` (an act already in the catalog) or `legislation`. */
export class AddLicenseLegislationDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  legislation_id?: string;

  @ApiPropertyOptional({ type: LegislationInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LegislationInputDto)
  legislation?: LegislationInputDto;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: '…conforme a Lei nº 12.305/2010…',
    maxLength: 4095,
  })
  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(4095)
  cited_excerpt?: string | null;
}
