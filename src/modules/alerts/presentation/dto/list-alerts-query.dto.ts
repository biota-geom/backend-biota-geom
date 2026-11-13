import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsIn, IsInt, Max, Min } from 'class-validator';
import { ALERT_STATUSES, AlertStatus } from '../../domain/alert.entity';
import { AUTH_MESSAGES } from '../../../auth/presentation/messages/auth.messages.pt-br';

export class ListAlertsQueryDto {
  @ApiPropertyOptional({
    type: String,
    default: 'OPEN,READ',
    example: 'OPEN,READ',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value.split(',').map((part) => part.trim())
      : value,
  )
  @IsArray({ message: AUTH_MESSAGES.INVALID_REQUEST })
  @ArrayNotEmpty({ message: AUTH_MESSAGES.INVALID_REQUEST })
  @IsIn(ALERT_STATUSES, { each: true, message: AUTH_MESSAGES.INVALID_REQUEST })
  status: AlertStatus[] = ['OPEN', 'READ'];

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt({ message: AUTH_MESSAGES.INVALID_REQUEST })
  @Min(1, { message: AUTH_MESSAGES.INVALID_REQUEST })
  @Max(2147483647, { message: AUTH_MESSAGES.INVALID_REQUEST })
  page = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt({ message: AUTH_MESSAGES.INVALID_REQUEST })
  @Min(1, { message: AUTH_MESSAGES.INVALID_REQUEST })
  @Max(100, { message: AUTH_MESSAGES.INVALID_REQUEST })
  page_size = 10;
}
