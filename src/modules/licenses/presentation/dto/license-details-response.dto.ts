import { ApiProperty } from '@nestjs/swagger';
import {
  ConditionPeriodicity,
  ConditionStatus,
  ConditionType,
  LicenseStatus,
} from '@prisma/client';
import { License } from '../../domain/license.entity';
import { LicenseCondition } from '../../domain/condition.entity';

export class LicenseConditionDetailsResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: '1.1' })
  item_number!: string;

  @ApiProperty({ example: 'Refere-se à atividade de estacionamento...' })
  description!: string;

  @ApiProperty({ enum: ['Informativo', 'Periódico'] })
  condition_type!: string;

  @ApiProperty({ example: 'NA' })
  periodicity!: string;

  @ApiProperty({ format: 'date-time', nullable: true })
  deadline!: string | null;

  @ApiProperty({ enum: ['Atendida', 'Em andamento', 'Atrasada'] })
  status!: string;

  @ApiProperty({ format: 'date-time', nullable: true })
  completion_date!: string | null;

  @ApiProperty({ example: 'Lucas Silva' })
  responsible_name!: string;

  @ApiProperty({ type: Boolean })
  is_violated!: boolean;
}

export class LicenseDetailsResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'LP nº 482/2024' })
  process_number!: string;

  @ApiProperty({ format: 'date-time' })
  issue_date!: string;

  @ApiProperty({ format: 'date-time' })
  expiration_date!: string;

  @ApiProperty({ enum: ['Regular', 'Atenção', 'Vencida'] })
  status!: string;

  @ApiProperty({ type: LicenseConditionDetailsResponseDto, isArray: true })
  conditions!: LicenseConditionDetailsResponseDto[];
}

const LICENSE_STATUS_LABELS: Record<LicenseStatus, string> = {
  [LicenseStatus.REGULAR]: 'Regular',
  [LicenseStatus.ATTENTION]: 'Atenção',
  [LicenseStatus.EXPIRED]: 'Vencida',
};

const CONDITION_TYPE_LABELS: Record<ConditionType, string> = {
  [ConditionType.INFORMATIVE]: 'Informativo',
  [ConditionType.PERIODIC]: 'Periódico',
};

const CONDITION_STATUS_LABELS: Record<ConditionStatus, string> = {
  [ConditionStatus.FULFILLED]: 'Atendida',
  [ConditionStatus.IN_PROGRESS]: 'Em andamento',
  [ConditionStatus.OVERDUE]: 'Atrasada',
};

export function toLicenseDetailsResponse(
  license: License & { conditions: LicenseCondition[] },
): LicenseDetailsResponseDto {
  return {
    id: license.id,
    process_number: license.processNumber,
    issue_date: license.issueDate.toISOString(),
    expiration_date: license.expirationDate.toISOString(),
    status: LICENSE_STATUS_LABELS[license.status],
    conditions: license.conditions.map(toLicenseConditionDetailsResponse),
  };
}

export function toLicenseConditionDetailsResponse(
  condition: LicenseCondition,
): LicenseConditionDetailsResponseDto {
  return {
    id: condition.id,
    item_number: condition.itemNumber,
    description: condition.description,
    condition_type: CONDITION_TYPE_LABELS[condition.conditionType],
    periodicity: condition.periodicity ?? 'NA',
    deadline: condition.deadline?.toISOString() ?? null,
    status: CONDITION_STATUS_LABELS[condition.status],
    completion_date: condition.completionDate?.toISOString() ?? null,
    responsible_name: condition.responsibleName,
    is_violated: condition.status === ConditionStatus.OVERDUE,
  };
}

export function toConditionStatus(
  status: string | undefined,
  isViolated: boolean | undefined,
): ConditionStatus | undefined {
  if (status !== undefined) {
    if (Object.values(ConditionStatus).includes(status as ConditionStatus)) {
      return status as ConditionStatus;
    }

    switch (status) {
      case 'Atendida':
        return ConditionStatus.FULFILLED;
      case 'Em atendimento':
      case 'Em andamento':
        return ConditionStatus.IN_PROGRESS;
      case 'Atrasada':
        return ConditionStatus.OVERDUE;
    }
  }

  if (isViolated !== undefined) {
    return isViolated ? ConditionStatus.OVERDUE : ConditionStatus.IN_PROGRESS;
  }

  return undefined;
}

export function toNullableIsoDate(
  value: string | null | undefined,
): Date | null | undefined {
  return value == null ? value : new Date(value);
}

export function toConditionPeriodicity(
  value: string | null | undefined,
): ConditionPeriodicity | null | undefined {
  if (value === 'NA') return null;
  return value as ConditionPeriodicity | null | undefined;
}

export function toConditionType(
  value: string | undefined,
): ConditionType | undefined {
  if (value === 'Informativo') return ConditionType.INFORMATIVE;
  if (value === 'Periódico') return ConditionType.PERIODIC;
  return value as ConditionType | undefined;
}
