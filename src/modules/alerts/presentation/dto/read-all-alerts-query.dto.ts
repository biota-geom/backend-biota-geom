import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { AUTH_MESSAGES } from '../../../auth/presentation/messages/auth.messages.pt-br';

export class ReadAllAlertsQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('all', { message: AUTH_MESSAGES.INVALID_REQUEST })
  customer_id?: string;
}
