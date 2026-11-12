import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { LegislationInputDto, trimToNull } from './legislation-input.dto';

export class UpdateLicenseLegislationDto {
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'null ou "" limpa o trecho citado.',
    maxLength: 4095,
  })
  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(4095)
  cited_excerpt?: string | null;

  @ApiPropertyOptional({
    type: LegislationInputDto,
    description:
      'Dados da lei. Só podem mudar quando ela está apenas no radar desta licença (senão 409).',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LegislationInputDto)
  legislation?: LegislationInputDto;
}
