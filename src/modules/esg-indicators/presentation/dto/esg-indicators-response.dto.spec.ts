import {
  toEsgIndicatorChanges,
  toEsgIndicatorsResponse,
} from './esg-indicators-response.dto';
import { SaveEsgIndicatorsDto } from './save-esg-indicators.dto';

describe('esg indicators response mapping', () => {
  it('maps stored values to the lowercase API contract, keeping nulls', () => {
    expect(
      toEsgIndicatorsResponse({
        WATER: 1250.5,
        WASTE: null,
        EMPLOYEES: 148,
        ENERGY: null,
      }),
    ).toEqual({ water: 1250.5, waste: null, employees: 148, energy: null });
  });

  it('maps the request body to changes, leaving omitted fields undefined', () => {
    const dto = new SaveEsgIndicatorsDto();
    dto.water = 10;
    dto.waste = null;

    expect(toEsgIndicatorChanges(dto)).toEqual({
      WATER: 10,
      WASTE: null,
      EMPLOYEES: undefined,
      ENERGY: undefined,
    });
  });
});
