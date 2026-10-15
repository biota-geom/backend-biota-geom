import { LicenseNotFoundError } from '../domain/errors/license-not-found.error';
import { LicenseRepository } from '../domain/licenses.repository';
import { ListLicenseHistoryUseCase } from './list-license-history.use-case';

function buildUseCase(licenses: Record<string, unknown>) {
  const findByIdForOwner = jest.fn((id: string) =>
    Promise.resolve(licenses[id] ?? null),
  );
  const useCase = new ListLicenseHistoryUseCase({
    findByIdForOwner,
  } as unknown as LicenseRepository);

  return { useCase, findByIdForOwner };
}

describe('ListLicenseHistoryUseCase', () => {
  it('follows the previous-license chain, newest first', async () => {
    const { useCase, findByIdForOwner } = buildUseCase({
      v3: { id: 'v3', previousLicenseId: 'v2' },
      v2: { id: 'v2', previousLicenseId: 'v1' },
      v1: { id: 'v1', previousLicenseId: null },
    });

    const history = await useCase.execute('v3', 'owner-1');

    expect(history.map((license) => license.id)).toEqual(['v3', 'v2', 'v1']);
    expect(findByIdForOwner).toHaveBeenCalledWith('v2', 'owner-1');
  });

  it('returns only the license itself when it was never renewed', async () => {
    const { useCase } = buildUseCase({ v1: { id: 'v1' } });

    const history = await useCase.execute('v1', 'owner-1');

    expect(history.map((license) => license.id)).toEqual(['v1']);
  });

  it('throws not found when the license is missing or belongs to another owner', async () => {
    const { useCase } = buildUseCase({});

    await expect(useCase.execute('v1', 'owner-1')).rejects.toThrow(
      LicenseNotFoundError,
    );
  });

  it('stops when a previous version is not accessible to the owner', async () => {
    const { useCase } = buildUseCase({
      v2: { id: 'v2', previousLicenseId: 'v1' },
    });

    const history = await useCase.execute('v2', 'owner-1');

    expect(history.map((license) => license.id)).toEqual(['v2']);
  });

  it('does not loop forever on a cyclic chain', async () => {
    const { useCase } = buildUseCase({
      a: { id: 'a', previousLicenseId: 'b' },
      b: { id: 'b', previousLicenseId: 'a' },
    });

    const history = await useCase.execute('a', 'owner-1');

    expect(history.map((license) => license.id)).toEqual(['a', 'b']);
  });
});
