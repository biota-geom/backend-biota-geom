import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class LinkCustomerEsgMetricsDto {
  @ApiProperty({
    type: [String],
    format: 'uuid',
    example: ['f47ac10b-58cc-4372-a567-0e02b2c3d479'],
  })
  @IsArray()
  @IsUUID(undefined, { each: true })
  metric_ids!: string[];
}
