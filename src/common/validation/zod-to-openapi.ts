import { z } from 'zod';

export function zodBody(schema: z.ZodType): Record<string, unknown> {
  return z.toJSONSchema(schema, {
    target: 'openapi-3.0',
    io: 'input',
  });
}
