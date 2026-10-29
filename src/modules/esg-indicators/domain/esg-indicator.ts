import { EsgPillar } from '../../esg-metrics/domain/esg-pillar';

/*
 * An indicator is a catalog entry (an ESG metric) that a customer reports
 * every month. Which ones a customer reports is decided when the customer is
 * created/edited (customer_esg_metrics) or by creating one inline.
 */
export const INDICATOR_CATEGORIES = [
  'Ambiental',
  'Social',
  'Governança',
] as const;

export type IndicatorCategory = (typeof INDICATOR_CATEGORIES)[number];

const CATEGORY_BY_PILLAR: Record<EsgPillar, IndicatorCategory> = {
  AMBIENTAL: 'Ambiental',
  SOCIAL: 'Social',
  GOVERNANCA: 'Governança',
};

export function pillarToCategory(pillar: EsgPillar): IndicatorCategory {
  return CATEGORY_BY_PILLAR[pillar];
}

export function categoryToPillar(category: IndicatorCategory): EsgPillar {
  const entry = Object.entries(CATEGORY_BY_PILLAR).find(
    ([, label]) => label === category,
  );

  return (entry as [EsgPillar, IndicatorCategory])[0];
}

export interface IndicatorDefinition {
  id: string;
  name: string;
  unit: string;
  category: IndicatorCategory;
}

export interface NewIndicator {
  name: string;
  unit: string;
  category: IndicatorCategory;
}

// An indicator of a customer for one month; null means nothing was recorded.
export interface MonthlyIndicator extends IndicatorDefinition {
  value: number | null;
}

/*
 * What a save asks to change for one indicator: a number creates or corrects
 * its record, null removes it. Indicators that are not listed stay untouched.
 */
export interface IndicatorRecordChange {
  indicatorId: string;
  value: number | null;
}

export function toMonthlyIndicators(
  indicators: IndicatorDefinition[],
  values: Map<string, number>,
): MonthlyIndicator[] {
  return indicators.map((indicator) => ({
    ...indicator,
    value: values.get(indicator.id) ?? null,
  }));
}
