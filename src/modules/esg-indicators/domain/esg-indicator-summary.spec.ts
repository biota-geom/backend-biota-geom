import { toIndicatorSummaries } from './esg-indicator-summary';

const WATER = {
  id: 'ind-1',
  name: 'Consumo de Água',
  unit: 'm³',
  category: 'Ambiental' as const,
};
const WASTE = {
  id: 'ind-2',
  name: 'Resíduos Totais',
  unit: 't',
  category: 'Ambiental' as const,
};

describe('toIndicatorSummaries', () => {
  it('compares each indicator with the month before by id', () => {
    expect(
      toIndicatorSummaries(
        [WATER, WASTE],
        new Map([
          ['ind-1', 1100],
          ['ind-2', 12.3],
        ]),
        new Map([['ind-1', 1000]]),
      ),
    ).toEqual([
      { ...WATER, current: 1100, previous: 1000, variationPct: 10 },
      { ...WASTE, current: 12.3, previous: null, variationPct: null },
    ]);
  });

  it('keeps an indicator without values in the list, all null', () => {
    expect(toIndicatorSummaries([WATER], new Map(), new Map())).toEqual([
      { ...WATER, current: null, previous: null, variationPct: null },
    ]);
  });
});
