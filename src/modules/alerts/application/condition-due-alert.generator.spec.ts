import { ConditionDueAlertGenerator } from './condition-due-alert.generator';
import { ConditionForAlert } from '../domain/condition-due-source';

describe('ConditionDueAlertGenerator', () => {
  const now = new Date('2026-06-01T12:00:00Z');
  const day = 24 * 60 * 60 * 1000;
  const list = jest.fn<Promise<ConditionForAlert[]>, []>();
  const generator = new ConditionDueAlertGenerator({ list });
  const condition = (
    id: string,
    dueInDays: number,
    alertInDays: number | null = null,
  ): ConditionForAlert => ({
    id,
    licenseId: 'license',
    customerId: 'customer',
    dueDate: new Date(now.getTime() + dueInDays * day),
    alertDate:
      alertInDays === null ? null : new Date(now.getTime() + alertInDays * day),
  });

  it('creates a HIGH alert for a condition due in 5 days', async () => {
    list.mockResolvedValue([condition('c', 5)]);
    const [alert] = await generator.generate({}, now);
    expect(alert).toEqual({
      type: 'CONDITION_DUE',
      severity: 'HIGH',
      dedupeKey: 'CONDITION_DUE:c:HIGH:2026-06-06',
      dueDate: new Date('2026-06-06T12:00:00Z'),
      customerId: 'customer',
      licenseId: 'license',
      licenseConditionId: 'c',
    });
  });

  it('creates a HIGH alert for an overdue condition', async () => {
    list.mockResolvedValue([condition('c', -2)]);
    const alerts = await generator.generate({}, now);
    expect(alerts.map((a) => a.severity)).toEqual(['HIGH']);
  });

  it('creates a MEDIUM alert for a condition due in 20 days', async () => {
    list.mockResolvedValue([condition('c', 20)]);
    const alerts = await generator.generate({}, now);
    expect(alerts.map((a) => a.severity)).toEqual(['MEDIUM']);
  });

  it('creates a LOW reminder when the alert date is today', async () => {
    list.mockResolvedValue([condition('c', 60, 0)]);
    const [alert] = await generator.generate({}, now);
    expect(alert.severity).toBe('LOW');
    expect(alert.dedupeKey).toBe('CONDITION_DUE:c:LOW:2026-07-31');
  });

  it('keeps the LOW reminder after the alert date has passed', async () => {
    list.mockResolvedValue([condition('c', 60, -3)]);
    const alerts = await generator.generate({}, now);
    expect(alerts.map((a) => a.severity)).toEqual(['LOW']);
  });

  it('ignores a regular condition without an alert date or with a future one', async () => {
    list.mockResolvedValue([condition('none', 60), condition('later', 60, 1)]);
    expect(await generator.generate({}, now)).toEqual([]);
  });

  it('prefers the risk severity over the reminder', async () => {
    list.mockResolvedValue([condition('c', 20, -10)]);
    const alerts = await generator.generate({}, now);
    expect(alerts.map((a) => a.severity)).toEqual(['MEDIUM']);
  });

  it('changes the key when the severity rises over time', async () => {
    list.mockResolvedValue([condition('c', 20)]);
    const [first] = await generator.generate({}, now);
    expect(await generator.generate({}, now)).toEqual([first]);
    const [later] = await generator.generate(
      {},
      new Date(now.getTime() + 15 * day),
    );
    expect(later.severity).toBe('HIGH');
    expect(later.dedupeKey).not.toBe(first.dedupeKey);
  });
});
