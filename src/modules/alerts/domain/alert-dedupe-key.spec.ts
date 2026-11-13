import { alertDedupeKey } from './alert-dedupe-key';

describe('alertDedupeKey', () => {
  it('uses the UTC date, record and severity as identity', () => {
    const date = new Date('2026-11-10T23:30:00-03:00');
    expect(alertDedupeKey('CONDITION_DUE', 'record', 'HIGH', date)).toBe(
      'CONDITION_DUE:record:HIGH:2026-11-11',
    );
    expect(alertDedupeKey('CONDITION_DUE', 'record', 'MEDIUM', date)).not.toBe(
      alertDedupeKey('CONDITION_DUE', 'record', 'HIGH', date),
    );
    expect(
      alertDedupeKey('CONDITION_DUE', 'record', 'HIGH', new Date('2026-11-12')),
    ).not.toBe(alertDedupeKey('CONDITION_DUE', 'record', 'HIGH', date));
  });
});
