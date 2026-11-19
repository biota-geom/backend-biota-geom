import { AlertGenerator, DesiredAlert } from '../domain/alert-generator';
import { SyncAlertsUseCase } from './sync-alerts.use-case';

describe('SyncAlertsUseCase', () => {
  const desired = { dedupeKey: 'k1' } as DesiredAlert;
  const generate = jest.fn();
  const generator = { type: 'LICENSE_EXPIRATION', generate } as AlertGenerator;
  const createMissing = jest.fn();
  const resolveStale = jest.fn();
  const useCase = new SyncAlertsUseCase([generator], {
    createMissing,
    resolveStale,
  });

  it('creates desired alerts, resolves the rest and sums counts', async () => {
    const now = new Date('2026-06-01');
    generate.mockResolvedValue([desired]);
    createMissing.mockResolvedValue(1);
    resolveStale.mockResolvedValue(2);

    const result = await useCase.execute({ ownerUserId: 'u' }, now);

    expect(result).toEqual({ created: 1, resolved: 2 });
    expect(generate).toHaveBeenCalledWith({ ownerUserId: 'u' }, now);
    expect(createMissing).toHaveBeenCalledWith([desired]);
    expect(resolveStale).toHaveBeenCalledWith(
      { ownerUserId: 'u' },
      'LICENSE_EXPIRATION',
      ['k1'],
    );
  });

  it('defaults to every customer', async () => {
    generate.mockResolvedValue([]);
    createMissing.mockResolvedValue(0);
    resolveStale.mockResolvedValue(0);
    await useCase.execute();
    expect(generate).toHaveBeenLastCalledWith({}, expect.any(Date));
  });
});
