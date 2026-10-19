import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SaveEsgIndicatorsDto } from './save-esg-indicators.dto';

async function errorsFor(body: Record<string, unknown>) {
  const errors = await validate(plainToInstance(SaveEsgIndicatorsDto, body));
  return errors.map((error) => error.property).sort();
}

describe('SaveEsgIndicatorsDto', () => {
  it('accepts the contract example', async () => {
    await expect(
      errorsFor({ water: 1250.5, waste: 12.3, employees: 148, energy: 53200 }),
    ).resolves.toEqual([]);
  });

  it('accepts a month with only part of the indicators, null and zero', async () => {
    await expect(errorsFor({ water: 10 })).resolves.toEqual([]);
    await expect(errorsFor({})).resolves.toEqual([]);
    await expect(
      errorsFor({ water: null, waste: 0, employees: 0 }),
    ).resolves.toEqual([]);
  });

  it('rejects negative values', async () => {
    await expect(
      errorsFor({ water: -1, waste: -0.1, employees: -3, energy: -5 }),
    ).resolves.toEqual(['employees', 'energy', 'waste', 'water']);
  });

  it('rejects a fractional number of employees', async () => {
    await expect(errorsFor({ employees: 10.5 })).resolves.toEqual([
      'employees',
    ]);
  });

  it('rejects non numeric values, too many decimals and huge numbers', async () => {
    await expect(
      errorsFor({ water: '10', waste: 1.23456, energy: 1e15 }),
    ).resolves.toEqual(['energy', 'waste', 'water']);
  });
});
