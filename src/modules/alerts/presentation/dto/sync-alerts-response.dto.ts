import { ApiProperty } from '@nestjs/swagger';

export class SyncAlertsResponseDto {
  @ApiProperty({ example: 1 })
  created!: number;

  @ApiProperty({ example: 0 })
  resolved!: number;
}
