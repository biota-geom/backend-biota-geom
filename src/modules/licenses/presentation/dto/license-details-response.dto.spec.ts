import {
  ConditionPeriodicity,
  ConditionStatus,
  ConditionType,
  LicenseStatus,
} from '@prisma/client';
import {
  toConditionPeriodicity,
  toConditionStatus,
  toConditionType,
  toLicenseConditionDetailsResponse,
  toLicenseDetailsResponse,
  toNullableIsoDate,
} from './license-details-response.dto';

describe('license details response mappers', () => {
  // Removido o 'as never' para que o TypeScript saiba que é um objeto válido
  const condition = {
    id: 'condition-1',
    itemNumber: '1.1',
    description: 'Relatório',
    conditionType: ConditionType.PERIODIC,
    periodicity: ConditionPeriodicity.MONTHLY,
    deadline: new Date('2027-01-02T00:00:00.000Z'),
    status: ConditionStatus.FULFILLED,
    completionDate: new Date('2026-12-01T00:00:00.000Z'),
    responsibleName: 'Ana',
  };

  it('maps license and condition details', () => {
    expect(
      toLicenseDetailsResponse({
        id: 'license-1',
        processNumber: 'LO 118/2020',
        issueDate: new Date('2020-01-01T00:00:00.000Z'),
        expirationDate: new Date('2028-01-01T00:00:00.000Z'),
        // Certifique-se de usar um status válido do LicenseStatus do Prisma (ex: ACTIVE ou o correto do seu enum)
        status: LicenseStatus.REGULAR,
        conditions: [condition],
      } as any), // Usar 'as any' em mocks de testes complexos evita travar o TS se faltarem propriedades secundárias do Prisma
    ).toEqual(
      expect.objectContaining({
        id: 'license-1',
        process_number: 'LO 118/2020',
        conditions: [expect.objectContaining({ status: 'Atendida' })],
      }),
    );
  });

  it.each([
    [ConditionStatus.FULFILLED, 'Atendida', false],
    [ConditionStatus.IN_PROGRESS, 'Em andamento', false],
    [ConditionStatus.OVERDUE, 'Atrasada', true],
  ])('maps condition status %s', (status, label, violated) => {
    expect(
      toLicenseConditionDetailsResponse({
        ...condition, // Agora funciona perfeitamente sem virar 'never'
        conditionStatus: status,
        status,
        conditionType: null,
        periodicity: null,
        deadline: null,
        completionDate: null,
      } as any),
    ).toEqual(
      expect.objectContaining({
        condition_type: undefined,
        periodicity: 'NA',
        status: label,
        is_violated: violated,
      }),
    );
  });

  it('converts all accepted input labels', () => {
    expect(toConditionStatus('Atendida', undefined)).toBe(
      ConditionStatus.FULFILLED,
    );
    expect(toConditionStatus('Em atendimento', undefined)).toBe(
      ConditionStatus.IN_PROGRESS,
    );
    expect(toConditionStatus('Em andamento', undefined)).toBe(
      ConditionStatus.IN_PROGRESS,
    );
    expect(toConditionStatus('Atrasada', undefined)).toBe(
      ConditionStatus.OVERDUE,
    );
    expect(toConditionStatus(ConditionStatus.FULFILLED, undefined)).toBe(
      ConditionStatus.FULFILLED,
    );
    expect(toConditionStatus(undefined, true)).toBe(ConditionStatus.OVERDUE);
    expect(toConditionStatus(undefined, false)).toBe(
      ConditionStatus.IN_PROGRESS,
    );
    expect(toConditionStatus('unknown', undefined)).toBeUndefined();
    expect(toConditionStatus(undefined, undefined)).toBeUndefined();
    expect(toNullableIsoDate(null)).toBeNull();
    expect(toNullableIsoDate(undefined)).toBeUndefined();
    expect(toNullableIsoDate('2027-01-01T00:00:00.000Z')).toEqual(
      new Date('2027-01-01T00:00:00.000Z'),
    );
    expect(toConditionPeriodicity('NA')).toBeNull();
    expect(toConditionPeriodicity(null)).toBeNull();
    expect(toConditionPeriodicity(undefined)).toBeUndefined();
    expect(toConditionPeriodicity(ConditionPeriodicity.ANNUAL)).toBe(
      ConditionPeriodicity.ANNUAL,
    );
    expect(toConditionType('Informativo')).toBe(ConditionType.INFORMATIVE);
    expect(toConditionType('Periódico')).toBe(ConditionType.PERIODIC);
    expect(toConditionType(ConditionType.PERIODIC)).toBe(
      ConditionType.PERIODIC,
    );
  });
});
