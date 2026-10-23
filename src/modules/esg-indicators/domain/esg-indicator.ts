/*
 * The four operational indicators a customer reports every month (US11).
 * Values match the Prisma `EsgIndicator` enum, so they can be passed to the
 * database as they are.
 */
export const ESG_INDICATORS = [
  'WATER',
  'WASTE',
  'EMPLOYEES',
  'ENERGY',
] as const;

export type EsgIndicator = (typeof ESG_INDICATORS)[number];

// What is stored for one month: null means no record for that indicator.
export type EsgIndicatorValues = Record<EsgIndicator, number | null>;

/*
 * What a save asks to change. An indicator that is left out is untouched,
 * a number creates or corrects its record, and null removes the record.
 */
export type EsgIndicatorChanges = Partial<Record<EsgIndicator, number | null>>;
