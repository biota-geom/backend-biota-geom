import { plainToInstance } from 'class-transformer';
import {
  toIndicatorRecordChanges,
  toMonthlyIndicatorResponse,
  toNewIndicatorResponse,
} from './esg-indicators-response.dto';
import { SaveEsgIndicatorsDto } from './save-esg-indicators.dto';

const DEFINITION = {
  id: 'ind-1',
  name: 'Consumo de Água',
  unit: 'm³',
  category: 'Ambiental' as const,
};

describe('esg indicators response mappers', () => {
  it('uses the contract field names', () => {
    expect(
      toMonthlyIndicatorResponse({ ...DEFINITION, value: 1250.5 }),
    ).toEqual({
      indicator_id: 'ind-1',
      name: 'Consumo de Água',
      unit: 'm³',
      category: 'Ambiental',
      value: 1250.5,
    });
  });

  it('shows a new indicator without a value', () => {
    expect(toNewIndicatorResponse(DEFINITION)).toEqual({
      indicator_id: 'ind-1',
      name: 'Consumo de Água',
      unit: 'm³',
      category: 'Ambiental',
      value: null,
    });
  });

  it('turns the request records into domain changes', () => {
    const dto = plainToInstance(SaveEsgIndicatorsDto, {
      records: [
        { indicator_id: 'ind-1', value: 10 },
        { indicator_id: 'ind-2', value: null },
      ],
    });

    expect(toIndicatorRecordChanges(dto)).toEqual([
      { indicatorId: 'ind-1', value: 10 },
      { indicatorId: 'ind-2', value: null },
    ]);
  });
});
