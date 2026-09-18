import { LicenseStatus } from '@prisma/client';
import { calculateLicenseStatus } from './license-status.calculator';

describe('calculateLicenseStatus', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');

  it('returns EXPIRED for an expiration date in the past', () => {
    const expiration = new Date('2025-12-31T00:00:00.000Z');

    expect(calculateLicenseStatus(expiration, now)).toBe(LicenseStatus.EXPIRED);
  });

  it('returns ATTENTION for an expiration date 15 days away', () => {
    const expiration = new Date('2026-01-16T00:00:00.000Z');

    expect(calculateLicenseStatus(expiration, now)).toBe(
      LicenseStatus.ATTENTION,
    );
  });

  it('returns ATTENTION exactly at the 30-day boundary', () => {
    const expiration = new Date('2026-01-31T00:00:00.000Z');

    expect(calculateLicenseStatus(expiration, now)).toBe(
      LicenseStatus.ATTENTION,
    );
  });

  it('returns REGULAR just past the 30-day boundary', () => {
    const expiration = new Date('2026-02-01T00:00:01.000Z');

    expect(calculateLicenseStatus(expiration, now)).toBe(LicenseStatus.REGULAR);
  });

  it('returns REGULAR for an expiration date next year', () => {
    const expiration = new Date('2027-01-01T00:00:00.000Z');

    expect(calculateLicenseStatus(expiration, now)).toBe(LicenseStatus.REGULAR);
  });

  it('defaults `now` to the current clock when not provided', () => {
    const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    expect(calculateLicenseStatus(farFuture)).toBe(LicenseStatus.REGULAR);
  });
});
