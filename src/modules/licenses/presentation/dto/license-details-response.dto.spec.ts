import {
  ConditionPeriodicity,
  ConditionStatus,
  ConditionType,
  LicenseStatus,
  LicenseType,
} from '@prisma/client';
import {
  toConditionPeriodicity,
  toConditionStatus,
  toConditionType,
  toLicenseConditionDetailsResponse,
  toLicenseDetailsResponse,
  toNullableIsoDate,
} from './license-details-response.dto';

function condition(
  id: string,
  environmentalDescriptor: string,
  createdAt: string,
  isViolated = false,
) {
  return {
    id,
    licenseId: 'license-1',
    title: id,
    environmentalDescriptor,
    description: 'Relatório',
    conditionType: ConditionType.PERIODIC,
    periodicity: ConditionPeriodicity.MONTHLY,
    deadline: new Date('2027-01-02T00:00:00.000Z'),
    dueDate: new Date('2027-01-02T00:00:00.000Z'),
    alertDate: null,
    completionDate: null,
    status: ConditionStatus.IN_PROGRESS,
    responsibleName: 'Ana',
    hasDelivery: true,
    isViolated,
    createdAt: new Date(createdAt),
    updatedAt: new Date(createdAt),
  };
}

describe('license details response mappers', () => {
  it('numbers descriptors and their conditions by first creation date', () => {
    const response = toLicenseDetailsResponse({
      id: 'license-1',
      customerId: 'customer-1',
      processNumber: 'LO 118/2020',
      type: LicenseType.LO,
      issuingAgencyId: 'agency-1',
      issueDate: new Date('2020-01-01T00:00:00.000Z'),
      expirationDate: new Date('2028-01-01T00:00:00.000Z'),
      status: LicenseStatus.REGULAR,
      documentUrl: 'url',
      createdAt: new Date(),
      updatedAt: new Date(),
      conditions: [
        condition('water-1', 'Água', '2026-01-03T00:00:00.000Z'),
        condition('waste-2', 'Resíduos', '2026-01-02T00:00:00.000Z'),
        condition('waste-1', 'Resíduos', '2026-01-01T00:00:00.000Z'),
      ],
    });

    expect(
      response.conditions.map((row) => ({
        number: row.item_number,
        descriptor: row.environmental_descriptor,
        isDescriptor: row.is_environmental_descriptor,
        id: row.id,
      })),
    ).toEqual([
      {
        number: '1',
        descriptor: 'Resíduos',
        isDescriptor: true,
        id: null,
      },
      {
        number: '1.1',
        descriptor: 'Resíduos',
        isDescriptor: false,
        id: 'waste-1',
      },
      {
        number: '1.2',
        descriptor: 'Resíduos',
        isDescriptor: false,
        id: 'waste-2',
      },
      { number: '2', descriptor: 'Água', isDescriptor: true, id: null },
      {
        number: '2.1',
        descriptor: 'Água',
        isDescriptor: false,
        id: 'water-1',
      },
    ]);
  });

  it('returns the persisted manual violation flag', () => {
    expect(
      toLicenseConditionDetailsResponse(
        condition('condition-1', 'Resíduos', '2026-01-01T00:00:00.000Z', true),
        '1.1',
      ),
    ).toEqual(expect.objectContaining({ is_violated: true }));
  });

  it('converts accepted condition-status labels without violation coupling', () => {
    expect(toConditionStatus('Atendida')).toBe(ConditionStatus.FULFILLED);
    expect(toConditionStatus('Em atendimento')).toBe(
      ConditionStatus.IN_PROGRESS,
    );
    expect(toConditionStatus('Em andamento')).toBe(ConditionStatus.IN_PROGRESS);
    expect(toConditionStatus('Atrasada')).toBe(ConditionStatus.OVERDUE);
    expect(toConditionStatus(ConditionStatus.FULFILLED)).toBe(
      ConditionStatus.FULFILLED,
    );
    expect(toConditionStatus('unknown')).toBeUndefined();
    expect(toConditionStatus(undefined)).toBeUndefined();
  });

  it('converts nullable dates, periodicities and condition types', () => {
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
