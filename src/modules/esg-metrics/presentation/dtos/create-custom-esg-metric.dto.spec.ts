import { describe, expect, it } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  ESG_METRIC_NAME_MAX_LENGTH,
  ESG_METRIC_UNIT_MAX_LENGTH,
  EsgPillar,
} from '../../domain/esg-pillar';
import { CreateCustomEsgMetricDto } from './create-custom-esg-metric.dto';

function toDto(plain: Record<string, unknown>): CreateCustomEsgMetricDto {
  return plainToInstance(CreateCustomEsgMetricDto, plain);
}

describe('CreateCustomEsgMetricDto', () => {
  const validPlain = {
    name: 'Water consumption',
    unit: 'm3',
    pillar: EsgPillar.AMBIENTAL,
    gri_standard_id: '550e8400-e29b-41d4-a716-446655440000',
  };

  it('trims whitespace from name and unit', () => {
    const dto = toDto({
      ...validPlain,
      name: '  Water consumption  ',
      unit: '  m3  ',
    });

    expect(dto.name).toBe('Water consumption');
    expect(dto.unit).toBe('m3');
  });

  it('leaves non-string name and unit values unchanged', () => {
    const dto = toDto({
      ...validPlain,
      name: 123,
      unit: null,
    });

    expect(dto.name).toBe(123);
    expect(dto.unit).toBeNull();
  });

  it('accepts a complete valid payload', async () => {
    const errors = await validate(toDto(validPlain));

    expect(errors).toHaveLength(0);
  });

  it('accepts a payload without the optional gri_standard_id', async () => {
    const errors = await validate(
      toDto({
        name: validPlain.name,
        unit: validPlain.unit,
        pillar: validPlain.pillar,
      }),
    );

    expect(errors).toHaveLength(0);
  });

  it('rejects an empty name, empty unit, invalid pillar, and invalid uuid', async () => {
    const errors = await validate(
      toDto({
        name: '   ',
        unit: '',
        pillar: 'INVALID',
        gri_standard_id: 'not-a-uuid',
      }),
    );
    const failedProperties = errors.map((error) => error.property);

    expect(failedProperties).toEqual(
      expect.arrayContaining(['name', 'unit', 'pillar', 'gri_standard_id']),
    );
  });

  it('rejects name and unit that exceed the max length', async () => {
    const errors = await validate(
      toDto({
        ...validPlain,
        name: 'x'.repeat(ESG_METRIC_NAME_MAX_LENGTH + 1),
        unit: 'y'.repeat(ESG_METRIC_UNIT_MAX_LENGTH + 1),
      }),
    );
    const failedProperties = errors.map((error) => error.property);

    expect(failedProperties).toEqual(expect.arrayContaining(['name', 'unit']));
  });
});
