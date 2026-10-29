/*
 * Month-over-month change of an indicator, in percent with one decimal place:
 * (current - previous) / previous * 100. There is no variation to show when
 * either month has no record or when the previous value is zero (the ratio is
 * undefined), so those cases return null.
 */
export function calculateVariationPct(
  current: number | null,
  previous: number | null,
): number | null {
  if (current === null || previous === null || previous === 0) {
    return null;
  }

  const variation = ((current - previous) / previous) * 100;
  // Rounds half away from zero, so -2.25 and 2.25 round to the same size.
  const rounded =
    (Math.sign(variation) * Math.round(Math.abs(variation) * 10)) / 10;

  // Avoids a negative zero for a change that rounds away to nothing.
  return rounded === 0 ? 0 : rounded;
}
