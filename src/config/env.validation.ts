import { z } from 'zod';
import { DURATION_PATTERN } from '../modules/auth/domain/duration';

// Values shipped in `.env.example` — never allowed once NODE_ENV=production.
const INSECURE_PLACEHOLDER_SECRETS = new Set([
  'replace-with-a-random-secret-at-least-32-characters-access',
  'replace-with-a-random-secret-at-least-32-characters-refresh',
]);

/*
 * Docker Compose (`${VAR:-}`) and an `.env` copied from `.env.example`
 * (`VAR=`) hand an unset optional variable over as an empty string; treat it
 * as absent instead of failing the boot.
 */
const optionalSecret = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1).optional(),
);

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
    // Public origin this API is served from — used to build absolute URLs
    // for locally-stored files (e.g. license documents).
    APP_BASE_URL: z.url().default('http://localhost:3000'),
    STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
    LOCAL_STORAGE_DIR: z.string().min(1).default('./storage'),
    // Only required when STORAGE_DRIVER=s3 (see superRefine below). Left
    // optional so `local` deployments never need real AWS credentials.
    AWS_S3_BUCKET: z.string().min(1).optional(),
    AWS_REGION: z.string().min(1).default('us-east-1'),
    AWS_ACCESS_KEY_ID: z.string().min(1).optional(),
    AWS_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    // Optional: S3-compatible endpoint (e.g. MinIO/LocalStack) or a CDN/custom
    // domain to use instead of the default *.s3.amazonaws.com object URL.
    AWS_S3_ENDPOINT: z.url().optional(),
    AWS_S3_PUBLIC_URL_BASE: z.url().optional(),
    // Lifetime of the pre-signed URLs handed out to view private documents.
    AWS_S3_SIGNED_URL_TTL_SECONDS: z.coerce
      .number()
      .int()
      .min(60)
      .max(3600)
      .default(900),
    // Amazon Bedrock (AI-assisted license extraction). Optional so the rest
    // of the API boots without it; the extraction endpoint answers 503 then.
    // Reuses AWS_REGION above and authenticates with a Bedrock API key.
    AWS_BEARER_TOKEN_BEDROCK: optionalSecret,
    BEDROCK_MODEL_ID: z
      .string()
      .min(1)
      .default('global.anthropic.claude-sonnet-5-5'),
    BEDROCK_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(1_000)
      .max(300_000)
      .default(180_000),
  })
  .superRefine((data, ctx) => {
    if (data.JWT_ACCESS_SECRET === data.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_REFRESH_SECRET'],
        message: 'JWT_REFRESH_SECRET must be different from JWT_ACCESS_SECRET',
      });
    }

    if (data.STORAGE_DRIVER === 's3') {
      const requiredS3Vars = [
        'AWS_S3_BUCKET',
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
      ] as const;

      for (const key of requiredS3Vars) {
        if (!data[key]) {
          ctx.addIssue({
            code: 'custom',
            path: [key],
            message: `${key} is required when STORAGE_DRIVER=s3`,
          });
        }
      }
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
