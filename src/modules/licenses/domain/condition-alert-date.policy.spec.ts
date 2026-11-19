import { assertAlertDateNotAfterDueDate } from './condition-alert-date.policy';
import { InvalidConditionAlertDateError } from './errors/invalid-condition-alert-date.error';

describe('assertAlertDateNotAfterDueDate', () => {
  const dueDate = new Date('2027-01-10T00:00:00.000Z');

  it('accepts an alert date before the due date', () => {
    expect(() =>
      assertAlertDateNotAfterDueDate(
        new Date('2027-01-09T00:00:00.000Z'),
        dueDate,
      ),
    ).not.toThrow();
  });

  it('accepts an alert date on the due date', () => {
    expect(() =>
      assertAlertDateNotAfterDueDate(new Date(dueDate), dueDate),
    ).not.toThrow();
  });

  it('rejects an alert date after the due date', () => {
    expect(() =>
      assertAlertDateNotAfterDueDate(
        new Date('2027-01-11T00:00:00.000Z'),
        dueDate,
      ),
    ).toThrow(InvalidConditionAlertDateError);
  });

  it.each([
    [null, dueDate],
    [undefined, dueDate],
    [new Date('2027-02-01T00:00:00.000Z'), null],
    [new Date('2027-02-01T00:00:00.000Z'), undefined],
  ])('accepts when a date is missing (%p, %p)', (alertDate, due) => {
    expect(() => assertAlertDateNotAfterDueDate(alertDate, due)).not.toThrow();
  });
});
