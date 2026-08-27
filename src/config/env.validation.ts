import { z } from 'zod';

const DURATION_PATTERN = /^\d+[smhd]$/;

// Values shipped in `.env.example` — never allowed once NODE_ENV=production.
const INSECURE_PLACEHOLDER_SECRETS = new Set([
  'replace-with-a-random-secret-at-least-32-characters-access',
  'replace-with-a-random-secret-at-least-32-characters-refresh',
]);

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_ACCESS_TTL: z.string().regex(DURATION_PATTERN).default('15m'),
    JWT_REFRESH_TTL: z.string().regex(DURATION_PATTERN).default('7d'),
    JWT_ISSUER: z.string().min(1).default('biota-geom-api'),
    JWT_AUDIENCE: z.string().min(1).default('biota-geom-web'),
    AUTH_ALLOWED_EMAIL_DOMAIN: z.string().min(3).default('biotageom.com.br'),
    CORS_ORIGINS: z.string().min(1).default('http://localhost:5173'),
  })
  .superRefine((data, ctx) => {
    if (data.JWT_ACCESS_SECRET === data.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_REFRESH_SECRET'],
        message: 'JWT_REFRESH_SECRET must be different from JWT_ACCESS_SECRET',
      });
    }

    if (data.NODE_ENV === 'production') {
      if (INSECURE_PLACEHOLDER_SECRETS.has(data.JWT_ACCESS_SECRET)) {
        ctx.addIssue({
          code: 'custom',
          path: ['JWT_ACCESS_SECRET'],
          message:
            'JWT_ACCESS_SECRET must not use the placeholder value in production',
        });
      }

      if (INSECURE_PLACEHOLDER_SECRETS.has(data.JWT_REFRESH_SECRET)) {
        ctx.addIssue({
          code: 'custom',
          path: ['JWT_REFRESH_SECRET'],
          message:
            'JWT_REFRESH_SECRET must not use the placeholder value in production',
        });
      }
    }
  });

export type EnvVars = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvVars {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }

  return result.data;
}
