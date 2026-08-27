const UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
};

// Parses durations shaped like "15m" / "7d" (as validated by env.validation.ts)
// into seconds, for API responses (`expires_in`) that can't carry a JWT string.
export function parseDurationToSeconds(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration);

  if (!match) {
    throw new Error(`Invalid duration format: "${duration}"`);
  }

  const [, amount, unit] = match;

  return Number(amount) * UNIT_SECONDS[unit];
}
