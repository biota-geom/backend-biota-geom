import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { AUTH_MESSAGES } from '../../../auth/presentation/messages/auth.messages.pt-br';

export class UpdateAlertStatusDto {
  @ApiProperty({ enum: ['READ', 'RESOLVED'] })
  @IsIn(['READ', 'RESOLVED'], { message: AUTH_MESSAGES.INVALID_REQUEST })
  status!: 'READ' | 'RESOLVED';
}
