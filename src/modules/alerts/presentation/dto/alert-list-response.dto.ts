import { ApiProperty } from '@nestjs/swagger';
import { AlertResponseDto } from './alert-response.dto';

export class AlertListResponseDto {
  @ApiProperty({ type: [AlertResponseDto] })
  items!: AlertResponseDto[];
  @ApiProperty()
  total!: number;
  @ApiProperty()
  page!: number;
  @ApiProperty()
  page_size!: number;
}

export class UnreadAlertCountResponseDto {
  @ApiProperty({ example: 3 })
  count!: number;
}
