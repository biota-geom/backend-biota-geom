export const EsgPillar = {
  AMBIENTAL: 'AMBIENTAL',
  SOCIAL: 'SOCIAL',
  GOVERNANCA: 'GOVERNANCA',
} as const;

export type EsgPillar = (typeof EsgPillar)[keyof typeof EsgPillar];

export const ESG_PILLAR_VALUES = Object.values(EsgPillar);

export const ESG_METRIC_NAME_MAX_LENGTH = 120;
export const ESG_METRIC_UNIT_MAX_LENGTH = 30;
