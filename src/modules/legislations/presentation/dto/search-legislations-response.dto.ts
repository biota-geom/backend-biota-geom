import { ApiProperty } from '@nestjs/swagger';
import { LegislationResponseDto } from './legislation-response.dto';

export class SearchLegislationsResponseDto {
  @ApiProperty({ type: LegislationResponseDto, isArray: true })
  legislations!: LegislationResponseDto[];
}
