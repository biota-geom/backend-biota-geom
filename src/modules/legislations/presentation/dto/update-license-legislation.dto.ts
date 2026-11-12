import { ApiPropertyOptional } from '@nestjs/swagger';
import { LegislationImpact } from '@prisma/client';
import { Equals, IsEnum, IsOptional, ValidateIf } from 'class-validator';

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
}
