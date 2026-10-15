import { ApiProperty } from '@nestjs/swagger';
import {
  ConditionPeriodicity,
  ConditionStatus,
  ConditionType,
  LicenseStatus,
} from '@prisma/client';
import { License } from '../../domain/license.entity';
import { LicenseCondition } from '../../domain/condition.entity';
import { LICENSE_TYPE_LABELS } from './license-labels';

export class LicenseConditionDetailsResponseDto {
  @ApiProperty({ format: 'uuid', nullable: true })
  id!: string | null;

  @ApiProperty({ example: '1.1' })
  item_number!: string;

  @ApiProperty({ type: Boolean })
  is_environmental_descriptor!: boolean;

  @ApiProperty({ example: 'Resíduos sólidos' })
  environmental_descriptor!: string;

  @ApiProperty({ example: 'MTR mensal', nullable: true })
  name!: string | null;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: ['Informativo', 'Periódico'], nullable: true })
  condition_type!: string | null;

  @ApiProperty({ example: 'NA' })
  periodicity!: string;

  @ApiProperty({ format: 'date-time', nullable: true })
  deadline!: string | null;

  @ApiProperty({ nullable: true })
  status!: string | null;

  @ApiProperty({ format: 'date-time', nullable: true })
  completion_date!: string | null;

  @ApiProperty({ nullable: true })
  responsible_name!: string | null;

  @ApiProperty({ type: Boolean, nullable: true })
  has_delivery!: boolean | null;

  @ApiProperty({ type: Boolean })
  is_violated!: boolean;
}

export class LicenseDetailsResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'LP nº 482/2024' })
  process_number!: string;

  @ApiProperty({ example: 'Licença Prévia (LP)' })
  type!: string;

  @ApiProperty({ example: 'FEPAM', nullable: true })
  issuing_agency!: string | null;

  @ApiProperty({ format: 'date-time' })
  issue_date!: string;

  @ApiProperty({ format: 'date-time' })
  expiration_date!: string;

  @ApiProperty({
    enum: ['Regular', 'Atenção', 'Vencida', 'Renovada/Arquivada'],
  })
  status!: string;

  @ApiProperty({ type: LicenseConditionDetailsResponseDto, isArray: true })
  conditions!: LicenseConditionDetailsResponseDto[];
}

const LICENSE_STATUS_LABELS: Record<LicenseStatus, string> = {
  [LicenseStatus.REGULAR]: 'Regular',
  [LicenseStatus.ATTENTION]: 'Atenção',
  [LicenseStatus.EXPIRED]: 'Vencida',
  [LicenseStatus.ARCHIVED]: 'Renovada/Arquivada',
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
    type: LICENSE_TYPE_LABELS[license.type],
    issuing_agency: license.issuingAgency?.name ?? null,
    issue_date: license.issueDate.toISOString(),
    expiration_date: license.expirationDate.toISOString(),
    status: LICENSE_STATUS_LABELS[license.status],
    conditions: toNumberedEnvironmentalDescriptorRows(license.conditions),
  };
}

export function toLicenseConditionDetailsResponse(
  condition: LicenseCondition,
  itemNumber = '',
): LicenseConditionDetailsResponseDto {
  return {
    id: condition.id,
    item_number: itemNumber,
    is_environmental_descriptor: false,
    environmental_descriptor: condition.environmentalDescriptor,
    name: condition.title,
    description: condition.description,
    condition_type:
      condition.conditionType === null
        ? null
        : CONDITION_TYPE_LABELS[condition.conditionType],
    periodicity: condition.periodicity ?? 'NA',
    deadline: condition.deadline?.toISOString() ?? null,
    status: CONDITION_STATUS_LABELS[condition.status],
    completion_date: condition.completionDate?.toISOString() ?? null,
    responsible_name: condition.responsibleName,
    has_delivery: condition.hasDelivery,
    is_violated: condition.isViolated,
  };
}

function toNumberedEnvironmentalDescriptorRows(
  conditions: LicenseCondition[],
): LicenseConditionDetailsResponseDto[] {
  const orderedConditions = [...conditions].sort(
    (left, right) =>
      left.createdAt.getTime() - right.createdAt.getTime() ||
      left.id.localeCompare(right.id),
  );
  const conditionsByEnvironmentalDescriptor = new Map<
    string,
    LicenseCondition[]
  >();

  orderedConditions.forEach((condition) => {
    const descriptorConditions =
      conditionsByEnvironmentalDescriptor.get(
        condition.environmentalDescriptor,
      ) ?? [];
    descriptorConditions.push(condition);
    conditionsByEnvironmentalDescriptor.set(
      condition.environmentalDescriptor,
      descriptorConditions,
    );
  });

  return [...conditionsByEnvironmentalDescriptor.entries()].flatMap(
    ([environmentalDescriptor, descriptorConditions], descriptorIndex) => {
      const descriptorNumber = String(descriptorIndex + 1);
      const descriptorRow: LicenseConditionDetailsResponseDto = {
        id: null,
        item_number: descriptorNumber,
        is_environmental_descriptor: true,
        environmental_descriptor: environmentalDescriptor,
        name: null,
        description: null,
        condition_type: null,
        periodicity: 'NA',
        deadline: null,
        status: null,
        completion_date: null,
        responsible_name: null,
        has_delivery: null,
        is_violated: false,
      };

      return [
        descriptorRow,
        ...descriptorConditions.map((condition, conditionIndex) =>
          toLicenseConditionDetailsResponse(
            condition,
            `${descriptorNumber}.${conditionIndex + 1}`,
          ),
        ),
      ];
    },
  );
}

export function toConditionStatus(
  status: string | undefined,
): ConditionStatus | undefined {
  if (status === undefined) return undefined;
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
    default:
      return undefined;
  }
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
