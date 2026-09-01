// Ensures env.validation.ts's required vars are always present in the test
// environment, independent of a local `.env` file (gitignored, absent in
// CI). Only fills gaps — never overrides a value already set — so any test
// that genuinely cares about a specific env var can still set it itself.
process.env.DATABASE_URL ??=
  'postgresql://test:test@localhost:5432/test?schema=public';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-at-least-32-characters';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-at-least-32-characters';
