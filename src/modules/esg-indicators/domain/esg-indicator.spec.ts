import {
  categoryToPillar,
  INDICATOR_CATEGORIES,
  pillarToCategory,
  toMonthlyIndicators,
} from './esg-indicator';

describe('esg-indicator', () => {
  it('translates every pillar to its category and back', () => {
    expect(pillarToCategory('AMBIENTAL')).toBe('Ambiental');
    expect(pillarToCategory('SOCIAL')).toBe('Social');
    expect(pillarToCategory('GOVERNANCA')).toBe('Governança');

    for (const category of INDICATOR_CATEGORIES) {
      expect(pillarToCategory(categoryToPillar(category))).toBe(category);
    }
    expect(categoryToPillar('Governança')).toBe('GOVERNANCA');
  });

  it('fills the month value of each indicator, null when there is none', () => {
    const indicators = [
      { id: 'a', name: 'Água', unit: 'm³', category: 'Ambiental' as const },
      { id: 'b', name: 'Resíduos', unit: 't', category: 'Ambiental' as const },
      { id: 'c', name: 'Zero', unit: 'un', category: 'Social' as const },
    ];

    expect(
      toMonthlyIndicators(
        indicators,
        new Map([
          ['a', 1250.5],
          ['c', 0],
        ]),
      ),
    ).toEqual([
      { ...indicators[0], value: 1250.5 },
      { ...indicators[1], value: null },
      { ...indicators[2], value: 0 },
    ]);
  });
});
