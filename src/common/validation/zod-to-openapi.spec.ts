import { z } from 'zod';
import { zodBody } from './zod-to-openapi';

describe('zodBody', () => {
  it('converts a plain Zod object schema to a JSON Schema', () => {
    const schema = z.object({ email: z.email(), password: z.string().min(8) });

    const result = zodBody(schema);

    expect(result.type).toBe('object');
    expect(result.required).toEqual(
      expect.arrayContaining(['email', 'password']),
    );
  });

  it('converts a schema using .transform() via the input shape', () => {
    const schema = z
      .object({ name: z.string() })
      .transform((data) => ({ fullName: data.name }));

    const result = zodBody(schema);

    expect(result.type).toBe('object');
    expect(result.properties).toHaveProperty('name');
  });
});
