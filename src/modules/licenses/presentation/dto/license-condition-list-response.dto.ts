import { ApiProperty } from '@nestjs/swagger';
import { LicenseConditionResponseDto } from './license-condition-response.dto';

export class LicenseConditionListResponseDto {
  @ApiProperty({ example: 1 })
  total!: number;

  @ApiProperty({ type: LicenseConditionResponseDto, isArray: true })
  data!: LicenseConditionResponseDto[];
}
