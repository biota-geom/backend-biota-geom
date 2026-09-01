import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
});

export type EnvVars = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvVars {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => {
        // Stryker disable next-line all: todo path deste schema tem um único
        // segmento (só existem chaves de primeiro nível), então o separador
        // '.' nunca chega a ser aplicado e trocá-lo por '' produz exatamente
        // a mesma string. É um mutante equivalente: nenhum teste conseguiria
        // matá-lo enquanto o schema for plano. Se algum campo aninhado for
        // adicionado, remova esta linha e cubra o separador com um teste.
        const path = issue.path.join('.');

        return `  - ${path}: ${issue.message}`;
      })
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }

  return result.data;
}
