import { toEsgIndicatorsSummaryResponse } from './esg-indicators-summary-response.dto';

describe('toEsgIndicatorsSummaryResponse', () => {
  it('maps the summary to the contract field names', () => {
    expect(
      toEsgIndicatorsSummaryResponse({
        referenceMonth: '2026-09',
        indicators: [
          {
            id: 'ind-1',
            name: 'Consumo de Água',
            unit: 'm³',
            category: 'Ambiental',
            current: 1100,
            previous: 1000,
            variationPct: 10,
          },
        ],
      }),
    ).toEqual({
      reference_month: '2026-09',
      indicators: [
        {
          indicator_id: 'ind-1',
          name: 'Consumo de Água',
          unit: 'm³',
          category: 'Ambiental',
          current: 1100,
          previous: 1000,
          variation_pct: 10,
        },
      ],
    });
  });

  it('keeps a null reference month for a customer without records', () => {
    expect(
      toEsgIndicatorsSummaryResponse({ referenceMonth: null, indicators: [] }),
    ).toEqual({ reference_month: null, indicators: [] });
  });
});
