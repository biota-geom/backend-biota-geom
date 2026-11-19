import { LicenseExpirationAlertGenerator } from './license-expiration-alert.generator';
import { LicenseForAlert } from '../domain/license-expiration-source';

describe('LicenseExpirationAlertGenerator', () => {
  const now = new Date('2026-06-01T12:00:00Z');
  const day = 24 * 60 * 60 * 1000;
  const list = jest.fn<Promise<LicenseForAlert[]>, []>();
  const generator = new LicenseExpirationAlertGenerator({
    list,
  });
  const license = (
    id: string,
    daysFromNow: number,
    status: LicenseForAlert['status'] = 'REGULAR',
  ): LicenseForAlert => ({
    id,
    customerId: 'customer',
    status,
    expirationDate: new Date(now.getTime() + daysFromNow * day),
  });

  it('creates a MEDIUM alert for a license expiring in 20 days', async () => {
    list.mockResolvedValue([license('a', 20)]);
    const [alert] = await generator.generate({}, now);
    expect(alert).toMatchObject({
      type: 'LICENSE_EXPIRATION',
      severity: 'MEDIUM',
      licenseId: 'a',
      customerId: 'customer',
      licenseConditionId: null,
    });
    expect(alert.dedupeKey).toBe('LICENSE_EXPIRATION:a:MEDIUM:2026-06-21');
  });

  it('creates a HIGH alert for an expired license', async () => {
    list.mockResolvedValue([license('a', -3)]);
    const alerts = await generator.generate({}, now);
    expect(alerts.map((a) => a.severity)).toEqual(['HIGH']);
  });

  it('ignores regular and archived licenses', async () => {
    list.mockResolvedValue([
      license('regular', 90),
      license('archived', -10, 'ARCHIVED'),
    ]);
    expect(await generator.generate({}, now)).toEqual([]);
  });

  it('is stable for the same now and changes severity over time', async () => {
    list.mockResolvedValue([license('a', 20)]);
    const first = await generator.generate({}, now);
    expect(await generator.generate({}, now)).toEqual(first);
    const later = await generator.generate(
      {},
      new Date(now.getTime() + 25 * day),
    );
    expect(later[0].severity).toBe('HIGH');
    expect(later[0].dedupeKey).not.toBe(first[0].dedupeKey);
  });
});
