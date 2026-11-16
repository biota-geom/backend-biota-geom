import { DuplicateRenewalConditionError } from './errors/duplicate-renewal-condition.error';
import { InvalidRenewalDueDateError } from './errors/invalid-renewal-due-date.error';
import { InvalidRenewalConditionHierarchyError } from './errors/invalid-renewal-condition-hierarchy.error';
import { RenewalConditionsOutdatedError } from './errors/renewal-conditions-outdated.error';
import {
  assertEveryConditionDecided,
  assertValidRenewalConditionHierarchy,
  assertValidRenewalDecisions,
} from './renewal-conditions.policy';

const NOW = new Date('2026-06-15T22:00:00.000Z');
const EXPIRATION = new Date('2030-01-10T00:00:00.000Z');

function copy(newDueDate?: Date) {
  return { conditionId: 'c-1', fulfilled: true, copyToNew: true, newDueDate };
}

describe('assertValidRenewalDecisions', () => {
  it('accepts decisions that do not copy anything', () => {
    expect(() =>
      assertValidRenewalDecisions(
        [{ conditionId: 'c-1', fulfilled: false, copyToNew: false }],
        EXPIRATION,
        NOW,
      ),
    ).not.toThrow();
  });

  it('rejects a condition decided twice', () => {
    const decision = { conditionId: 'c-1', fulfilled: true, copyToNew: false };

    expect(() =>
      assertValidRenewalDecisions([decision, decision], EXPIRATION, NOW),
    ).toThrow(DuplicateRenewalConditionError);
  });

  it.each([
    ['missing', undefined],
    ['unparseable', new Date('not a date')],
    ['yesterday', new Date('2026-06-14T00:00:00.000Z')],
    ['after the expiration', new Date('2030-01-11T00:00:00.000Z')],
  ])('rejects a new due date that is %s', (_case, newDueDate) => {
    expect(() =>
      assertValidRenewalDecisions([copy(newDueDate)], EXPIRATION, NOW),
    ).toThrow(InvalidRenewalDueDateError);
  });

  it.each([
    // Late in the UTC day, today's date-only value is still accepted.
    ['today', new Date('2026-06-15T00:00:00.000Z')],
    ['the expiration date', EXPIRATION],
  ])('accepts a new due date on %s', (_case, newDueDate) => {
    expect(() =>
      assertValidRenewalDecisions([copy(newDueDate)], EXPIRATION, NOW),
    ).not.toThrow();
  });
});

describe('assertEveryConditionDecided', () => {
  const decide = (conditionId: string) => ({
    conditionId,
    fulfilled: true,
    copyToNew: false,
  });

  it('accepts decisions covering exactly the current conditions', () => {
    expect(() =>
      assertEveryConditionDecided(
        ['c-1', 'c-2'],
        [decide('c-2'), decide('c-1')],
      ),
    ).not.toThrow();
  });

  it.each([
    ['a condition was added', ['c-1', 'c-2'], ['c-1']],
    ['a condition was removed', ['c-1'], ['c-1', 'c-2']],
    ['a condition was replaced', ['c-1', 'c-3'], ['c-1', 'c-2']],
  ])('rejects as outdated when %s', (_case, current, decided) => {
    expect(() =>
      assertEveryConditionDecided(current, decided.map(decide)),
    ).toThrow(RenewalConditionsOutdatedError);
  });
});

describe('assertValidRenewalConditionHierarchy', () => {
  const conditions = [
    { id: 'parent', parentConditionId: null },
    { id: 'child', parentConditionId: 'parent' },
  ];

  it('accepts a copied sub-item when its parent is also copied', () => {
    expect(() =>
      assertValidRenewalConditionHierarchy(conditions, [
        { conditionId: 'parent', fulfilled: false, copyToNew: true },
        { conditionId: 'child', fulfilled: false, copyToNew: true },
      ]),
    ).not.toThrow();
  });

  it('rejects copying a sub-item without copying its parent', () => {
    expect(() =>
      assertValidRenewalConditionHierarchy(conditions, [
        { conditionId: 'parent', fulfilled: false, copyToNew: false },
        { conditionId: 'child', fulfilled: false, copyToNew: true },
      ]),
    ).toThrow(InvalidRenewalConditionHierarchyError);
  });
});
