import { IndicatorDefinition } from './esg-indicator';
import { calculateVariationPct } from './esg-indicator-variation';

// One indicator of the summary: the month, the month before and the change.
export interface IndicatorSummary extends IndicatorDefinition {
  current: number | null;
  previous: number | null;
  variationPct: number | null;
}

/*
 * referenceMonth is null only when the customer has no record at all and no
 * month was asked for; every indicator is then empty.
 */
export interface EsgIndicatorsSummary {
  referenceMonth: string | null;
  indicators: IndicatorSummary[];
}

// Every indicator of the customer, compared with the month before by id.
export function toIndicatorSummaries(
  indicators: IndicatorDefinition[],
  current: Map<string, number>,
  previous: Map<string, number>,
): IndicatorSummary[] {
  return indicators.map((indicator) => {
    const currentValue = current.get(indicator.id) ?? null;
    const previousValue = previous.get(indicator.id) ?? null;

    return {
      ...indicator,
      current: currentValue,
      previous: previousValue,
      variationPct: calculateVariationPct(currentValue, previousValue),
    };
  });
}
