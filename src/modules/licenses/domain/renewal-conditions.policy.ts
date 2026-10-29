import { DuplicateRenewalConditionError } from './errors/duplicate-renewal-condition.error';
import { InvalidRenewalDueDateError } from './errors/invalid-renewal-due-date.error';
import { RenewalConditionsOutdatedError } from './errors/renewal-conditions-outdated.error';
import { RenewalConditionDecision } from './renew-license.data';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/*
 * Rules that only depend on the request itself: each condition is decided
 * once, and a copied condition gets a due date from today up to the new
 * license's expiration date. "Today" is the UTC day, the calendar date-only
 * inputs are parsed in.
 */
export function assertValidRenewalDecisions(
  decisions: RenewalConditionDecision[],
  newExpirationDate: Date,
  now: Date = new Date(),
): void {
  const decidedIds = new Set(decisions.map((item) => item.conditionId));
  if (decidedIds.size !== decisions.length) {
    throw new DuplicateRenewalConditionError();
  }

  const startOfToday = Math.floor(now.getTime() / MS_PER_DAY) * MS_PER_DAY;
  const hasInvalidDueDate = decisions.some(
    ({ copyToNew, newDueDate }) =>
      copyToNew &&
      (!newDueDate ||
        Number.isNaN(newDueDate.getTime()) ||
        newDueDate.getTime() < startOfToday ||
        newDueDate.getTime() > newExpirationDate.getTime()),
  );
  if (hasInvalidDueDate) {
    throw new InvalidRenewalDueDateError();
  }
}

/*
 * The decisions must cover exactly the conditions the previous license has
 * right now. Any difference, a condition added or one that no longer exists,
 * means the list changed after the caller loaded it.
 */
export function assertEveryConditionDecided(
  conditionIds: string[],
  decisions: RenewalConditionDecision[],
): void {
  const decidedIds = new Set(decisions.map((item) => item.conditionId));
  const coversEveryCondition =
    decidedIds.size === conditionIds.length &&
    conditionIds.every((id) => decidedIds.has(id));

  if (!coversEveryCondition) {
    throw new RenewalConditionsOutdatedError();
  }
}
