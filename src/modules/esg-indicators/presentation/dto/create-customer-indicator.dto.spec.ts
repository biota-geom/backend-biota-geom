import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCustomerIndicatorDto } from './create-customer-indicator.dto';

async function failures(body: Record<string, unknown>) {
  const dto = plainToInstance(CreateCustomerIndicatorDto, body);
  const errors = await validate(dto);

  return { dto, properties: errors.map((error) => error.property).sort() };
}

describe('CreateCustomerIndicatorDto', () => {
  it('accepts the contract example and trims the text', async () => {
    const { dto, properties } = await failures({
      name: '  Consumo de Combustível ',
      unit: ' L ',
      category: 'Ambiental',
    });

    expect(properties).toEqual([]);
    expect(dto.name).toBe('Consumo de Combustível');
    expect(dto.unit).toBe('L');
  });

  it.each(['Ambiental', 'Social', 'Governança'])(
    'accepts %s',
    async (category) => {
      await expect(
        failures({ name: 'X', unit: 'u', category }).then((r) => r.properties),
      ).resolves.toEqual([]);
    },
  );

  it('rejects blank, missing and oversized text', async () => {
    await expect(
      failures({ name: '   ', unit: '', category: 'Social' }).then(
        (r) => r.properties,
      ),
    ).resolves.toEqual(['name', 'unit']);
    await expect(
      failures({ category: 'Social' }).then((r) => r.properties),
    ).resolves.toEqual(['name', 'unit']);
    await expect(
      failures({
        name: 'a'.repeat(121),
        unit: 'b'.repeat(31),
        category: 'Social',
      }).then((r) => r.properties),
    ).resolves.toEqual(['name', 'unit']);
  });

  it('rejects an unknown category', async () => {
    await expect(
      failures({ name: 'X', unit: 'u', category: 'AMBIENTAL' }).then(
        (r) => r.properties,
      ),
    ).resolves.toEqual(['category']);
  });
});
