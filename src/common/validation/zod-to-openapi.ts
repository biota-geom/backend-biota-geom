import { z } from 'zod';

// Generates a Swagger request-body schema straight from a Zod schema, so the
// `/docs` contract can never drift from what the pipe actually validates.
// `io: 'input'` is required for schemas using `.transform()` (e.g.
// snake_case -> camelCase mapping), since Zod can't represent a transform's
// output shape as JSON Schema.
export function zodBody(schema: z.ZodType): Record<string, unknown> {
  return z.toJSONSchema(schema, {
    target: 'openapi-3.0',
    io: 'input',
  });
}
