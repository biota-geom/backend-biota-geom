import { ApiPropertyOptional } from '@nestjs/swagger';
import { LegislationImpact } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  Equals,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { LegislationInputDto, trimToNull } from './legislation-input.dto';

export class UpdateLicenseLegislationDto {
  @ApiPropertyOptional({
    enum: LegislationImpact,
    enumName: 'LegislationImpact',
    nullable: true,
    description: 'null remove a classificação.',
  })
  @IsOptional() // skips validation for undefined AND null
  @IsEnum(LegislationImpact)
  impact?: LegislationImpact | null;

  @ApiPropertyOptional({
    type: Boolean,
    enum: [true],
    description: 'Só aceita true: marca o item como lido (grava read_at).',
  })
  @ValidateIf((dto: UpdateLicenseLegislationDto) => dto.read !== undefined)
  @Equals(true)
  read?: true;

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
