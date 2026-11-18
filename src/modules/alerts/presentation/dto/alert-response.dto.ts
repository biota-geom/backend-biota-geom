import { ApiProperty } from '@nestjs/swagger';
import { ALERT_STATUSES, ALERT_TYPES } from '../../domain/alert.entity';
import type {
  Alert,
  AlertSeverity,
  AlertStatus,
  AlertType,
} from '../../domain/alert.entity';
import { ALERT_MESSAGES } from '../../../auth/presentation/messages/auth.messages.pt-br';

class AlertCustomerDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty()
  name!: string;
}

class AlertLicenseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty()
  type!: string;
  @ApiProperty()
  process_number!: string;
}

export class AlertResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty({ enum: ALERT_TYPES })
  type!: AlertType;
  @ApiProperty({ enum: ['LOW', 'MEDIUM', 'HIGH'] })
  severity!: AlertSeverity;
  @ApiProperty({ enum: ALERT_STATUSES })
  status!: AlertStatus;
  @ApiProperty()
  title!: string;
  @ApiProperty()
  message!: string;
  @ApiProperty({ format: 'date-time' })
  due_date!: string;
  @ApiProperty({ type: AlertCustomerDto })
  customer!: AlertCustomerDto;
  @ApiProperty({ type: AlertLicenseDto })
  license!: AlertLicenseDto;
  @ApiProperty({ type: AlertCustomerDto, nullable: true })
  condition!: AlertCustomerDto | null;
  @ApiProperty({ format: 'date-time' })
  created_at!: string;
}

export function toAlertResponse(
  alert: Alert,
  now = new Date(),
): AlertResponseDto {
  const days = Math.ceil((alert.dueDate.getTime() - now.getTime()) / 86400000);
  const license = `${alert.license.type} ${alert.license.processNumber}`;
  let title: string;
  if (alert.type === 'LICENSE_EXPIRATION') {
    title =
      alert.severity === 'HIGH' || days < 0
        ? ALERT_MESSAGES.LICENSE_EXPIRED
        : ALERT_MESSAGES.LICENSE_DUE(days);
  } else {
    title =
      alert.severity === 'LOW'
        ? ALERT_MESSAGES.CONDITION_REMINDER
        : days < 0
          ? ALERT_MESSAGES.CONDITION_EXPIRED
          : ALERT_MESSAGES.CONDITION_DUE(days);
  }
  return {
    id: alert.id,
    type: alert.type,
    severity: alert.severity,
    status: alert.status,
    title,
    message: alert.condition
      ? ALERT_MESSAGES.CONDITION_MESSAGE(alert.condition.name, license)
      : license,
    due_date: alert.dueDate.toISOString(),
    customer: alert.customer,
    license: {
      id: alert.license.id,
      type: alert.license.type,
      process_number: alert.license.processNumber,
    },
    condition: alert.condition,
    created_at: alert.createdAt.toISOString(),
  };
}
