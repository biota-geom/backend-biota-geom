import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  MAX_RECORDS_PER_REQUEST,
  SaveEsgIndicatorsDto,
} from './save-esg-indicators.dto';

const ID = '0197a1c2-7c1e-7a43-9b0e-2f6d4c1b8a10';

async function failures(body: Record<string, unknown>) {
  const errors = await validate(plainToInstance(SaveEsgIndicatorsDto, body));
  const flatten = (list: typeof errors, parent = ''): string[] =>
    list.flatMap((error) => {
      const path = parent ? `${parent}.${error.property}` : error.property;
      return [
        ...(error.constraints ? [path] : []),
        ...flatten(error.children ?? [], path),
      ];
    });

  return flatten(errors).sort();
}

describe('SaveEsgIndicatorsDto', () => {
  it('accepts a list of measurements, zero and null', async () => {
    await expect(
      failures({
        records: [
          { indicator_id: ID, value: 1250.5 },
          { indicator_id: ID, value: 0 },
          { indicator_id: ID, value: null },
        ],
      }),
    ).resolves.toEqual([]);
  });

  it('accepts an empty list (partial save with nothing filled in)', async () => {
    await expect(failures({ records: [] })).resolves.toEqual([]);
  });

  it('requires the list', async () => {
    await expect(failures({})).resolves.toEqual(['records']);
    await expect(failures({ records: 'x' })).resolves.toEqual(['records']);
  });

  it('rejects a list that is too long', async () => {
    const records = Array.from({ length: MAX_RECORDS_PER_REQUEST + 1 }, () => ({
      indicator_id: ID,
      value: 1,
    }));

    await expect(failures({ records })).resolves.toEqual(['records']);
  });

  it('rejects a negative value', async () => {
    await expect(
      failures({ records: [{ indicator_id: ID, value: -1 }] }),
    ).resolves.toEqual(['records.0.value']);
  });

  it('rejects text, missing value, too many decimals and huge numbers', async () => {
    await expect(
      failures({
        records: [
          { indicator_id: ID, value: '10' },
          { indicator_id: ID },
          { indicator_id: ID, value: 1.23456 },
          { indicator_id: ID, value: 1e15 },
        ],
      }),
    ).resolves.toEqual([
      'records.0.value',
      'records.1.value',
      'records.2.value',
      'records.3.value',
    ]);
  });

  it('rejects an indicator id that is not a UUID', async () => {
    await expect(
      failures({ records: [{ indicator_id: 'abc', value: 1 }] }),
    ).resolves.toEqual(['records.0.indicator_id']);
  });
});
