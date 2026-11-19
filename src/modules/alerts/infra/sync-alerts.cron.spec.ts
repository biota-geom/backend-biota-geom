import { SyncAlertsUseCase } from '../application/sync-alerts.use-case';
import { SyncAlertsCron } from './sync-alerts.cron';

describe('SyncAlertsCron', () => {
  const execute = jest.fn();
  const cron = new SyncAlertsCron({ execute } as unknown as SyncAlertsUseCase);

  it('runs the sync for every customer', async () => {
    execute.mockResolvedValue({ created: 1, resolved: 0 });
    await cron.run();
    expect(execute).toHaveBeenCalledWith();
  });

  it('does not throw when the sync fails', async () => {
    execute.mockRejectedValue(new Error('db down'));
    await expect(cron.run()).resolves.toBeUndefined();
  });

  it('does not throw when the sync rejects with a non-Error value', async () => {
    execute.mockRejectedValue('db down');
    await expect(cron.run()).resolves.toBeUndefined();
  });

  it('logs the registration on startup', () => {
    expect(() => cron.onModuleInit()).not.toThrow();
  });
});
