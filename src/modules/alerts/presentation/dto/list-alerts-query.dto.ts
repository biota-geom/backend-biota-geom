import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import {
  ALERT_SEVERITIES,
  ALERT_STATUSES,
  ALERT_TYPES,
  AlertSeverity,
  AlertStatus,
  AlertType,
} from '../../domain/alert.entity';
import { AUTH_MESSAGES } from '../../../auth/presentation/messages/auth.messages.pt-br';

function splitCommaSeparated(value: unknown): unknown {
  return typeof value === 'string'
    ? value.split(',').map((part) => part.trim())
    : value;
}

export class ListAlertsQueryDto {
  @ApiPropertyOptional({
    type: String,
    default: 'OPEN,READ',
    example: 'OPEN,READ',
  })
  @Transform(({ value }: { value: unknown }) => splitCommaSeparated(value))
  @IsArray({ message: AUTH_MESSAGES.INVALID_REQUEST })
  @ArrayNotEmpty({ message: AUTH_MESSAGES.INVALID_REQUEST })
  @IsIn(ALERT_STATUSES, { each: true, message: AUTH_MESSAGES.INVALID_REQUEST })
  status: AlertStatus[] = ['OPEN', 'READ'];

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('all', { message: AUTH_MESSAGES.INVALID_REQUEST })
  customer_id?: string;

  @ApiPropertyOptional({
    type: String,
    example: 'LICENSE_EXPIRATION,CONDITION_DUE',
  })
  @Transform(({ value }: { value: unknown }) => splitCommaSeparated(value))
  @IsOptional()
  @IsArray({ message: AUTH_MESSAGES.INVALID_REQUEST })
  @ArrayNotEmpty({ message: AUTH_MESSAGES.INVALID_REQUEST })
  @IsIn(ALERT_TYPES, { each: true, message: AUTH_MESSAGES.INVALID_REQUEST })
  type?: AlertType[];

  @ApiPropertyOptional({ type: String, example: 'HIGH,MEDIUM' })
  @Transform(({ value }: { value: unknown }) => splitCommaSeparated(value))
  @IsOptional()
  @IsArray({ message: AUTH_MESSAGES.INVALID_REQUEST })
  @ArrayNotEmpty({ message: AUTH_MESSAGES.INVALID_REQUEST })
  @IsIn(ALERT_SEVERITIES, {
    each: true,
    message: AUTH_MESSAGES.INVALID_REQUEST,
  })
  severity?: AlertSeverity[];

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
