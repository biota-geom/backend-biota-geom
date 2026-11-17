import { ApiPropertyOptional } from '@nestjs/swagger';
import { LegislationImpact } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class ListLicenseLegislationsQueryDto {
  @ApiPropertyOptional({
    enum: LegislationImpact,
    enumName: 'LegislationImpact',
  })
  @IsOptional()
  @IsEnum(LegislationImpact)
  impact?: LegislationImpact;
}
