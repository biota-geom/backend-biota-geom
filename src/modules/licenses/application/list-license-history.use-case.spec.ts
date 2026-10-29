import { LicenseStatus } from '@prisma/client';
import { LicenseNotFoundError } from '../domain/errors/license-not-found.error';
import { LicenseRepository } from '../domain/licenses.repository';
import { ListLicenseHistoryUseCase } from './list-license-history.use-case';

type StoredLicense = {
  id: string;
  previousLicenseId?: string | null;
  createdAt?: Date;
  status?: LicenseStatus;
  expirationDate?: Date;
};

function license(id: string, fields: Omit<StoredLicense, 'id'> = {}) {
  return {
    id,
    customerId: 'customer-1',
    previousLicenseId: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    status: LicenseStatus.ARCHIVED,
    expirationDate: new Date('2030-01-01T00:00:00.000Z'),
    ...fields,
  };
}

function buildUseCase(licenses: ReturnType<typeof license>[]) {
  const findByIdForOwner = jest.fn((id: string) =>
    Promise.resolve(licenses.find((item) => item.id === id) ?? null),
  );
  const findAllByCustomerId = jest.fn().mockResolvedValue(licenses);
  const useCase = new ListLicenseHistoryUseCase({
    findByIdForOwner,
    findAllByCustomerId,
  } as unknown as LicenseRepository);

  return { useCase, findByIdForOwner, findAllByCustomerId };
}

const CHAIN = [
  license('v1'),
  license('v2', { previousLicenseId: 'v1' }),
  license('v3', {
    previousLicenseId: 'v2',
    status: LicenseStatus.REGULAR,
  }),
];

describe('ListLicenseHistoryUseCase', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-15T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('follows the previous-license chain, newest first', async () => {
    const { useCase, findAllByCustomerId } = buildUseCase(CHAIN);

    const history = await useCase.execute('v3', 'owner-1');

    expect(history.map((item) => item.id)).toEqual(['v3', 'v2', 'v1']);
    expect(findAllByCustomerId).toHaveBeenCalledTimes(1);
    expect(findAllByCustomerId).toHaveBeenCalledWith('customer-1');
  });

  it('also lists the renewals that replaced an older version', async () => {
    const { useCase } = buildUseCase(CHAIN);

    await expect(
      useCase.execute('v1', 'owner-1').then((h) => h.map((item) => item.id)),
    ).resolves.toEqual(['v3', 'v2', 'v1']);
    await expect(
      useCase.execute('v2', 'owner-1').then((h) => h.map((item) => item.id)),
    ).resolves.toEqual(['v3', 'v2', 'v1']);
  });

  it('leaves out licenses of the customer that are not in the chain', async () => {
    const { useCase } = buildUseCase([...CHAIN, license('other')]);

    const history = await useCase.execute('v2', 'owner-1');

    expect(history.map((item) => item.id)).toEqual(['v3', 'v2', 'v1']);
  });

  it('returns only the license itself when it was never renewed', async () => {
    const { useCase } = buildUseCase([license('v1')]);

    const history = await useCase.execute('v1', 'owner-1');

    expect(history.map((item) => item.id)).toEqual(['v1']);
  });

  it('throws not found when the license is missing or belongs to another owner', async () => {
    const { useCase, findAllByCustomerId } = buildUseCase([]);

    await expect(useCase.execute('v1', 'owner-1')).rejects.toThrow(
      LicenseNotFoundError,
    );
    expect(findAllByCustomerId).not.toHaveBeenCalled();
  });

  it('stops when a previous version is no longer stored', async () => {
    const { useCase } = buildUseCase([
      license('v2', { previousLicenseId: 'v1' }),
    ]);

    const history = await useCase.execute('v2', 'owner-1');

    expect(history.map((item) => item.id)).toEqual(['v2']);
  });

  it('does not loop forever on a cyclic chain', async () => {
    const { useCase } = buildUseCase([
      license('a', { previousLicenseId: 'b' }),
      license('b', { previousLicenseId: 'a' }),
    ]);

    const history = await useCase.execute('a', 'owner-1');

    expect(history.map((item) => item.id).sort()).toEqual(['a', 'b']);
  });

  it('follows the oldest renewal if a license was renewed twice', async () => {
    const { useCase } = buildUseCase([
      license('v1'),
      license('late', {
        previousLicenseId: 'v1',
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
      }),
      license('early', {
        previousLicenseId: 'v1',
        createdAt: new Date('2026-02-01T00:00:00.000Z'),
      }),
    ]);

    const history = await useCase.execute('v1', 'owner-1');

    expect(history.map((item) => item.id)).toEqual(['early', 'v1']);
  });

  it('re-derives the status of versions that are not archived', async () => {
    const { useCase } = buildUseCase([
      license('v1'),
      license('v2', {
        previousLicenseId: 'v1',
        // Stored as REGULAR at creation, expired since.
        status: LicenseStatus.REGULAR,
        expirationDate: new Date('2026-01-01T00:00:00.000Z'),
      }),
    ]);

    const history = await useCase.execute('v1', 'owner-1');

    expect(history.map((item) => [item.id, item.status])).toEqual([
      ['v2', LicenseStatus.EXPIRED],
      ['v1', LicenseStatus.ARCHIVED],
    ]);
  });
});
