import { AlertsRepository } from '../domain/alerts.repository';
import { MarkAllAlertsReadUseCase } from './mark-all-alerts-read.use-case';

describe('MarkAllAlertsReadUseCase', () => {
  const repository = {
    list: jest.fn<
      ReturnType<AlertsRepository['list']>,
      Parameters<AlertsRepository['list']>
    >(),
    countUnread: jest.fn<
      ReturnType<AlertsRepository['countUnread']>,
      Parameters<AlertsRepository['countUnread']>
    >(),
    markAllRead: jest.fn<
      ReturnType<AlertsRepository['markAllRead']>,
      Parameters<AlertsRepository['markAllRead']>
    >(),
    updateStatus: jest.fn<
      ReturnType<AlertsRepository['updateStatus']>,
      Parameters<AlertsRepository['updateStatus']>
    >(),
  } satisfies jest.Mocked<AlertsRepository>;

  const useCase = new MarkAllAlertsReadUseCase(repository);

  beforeEach(() => jest.resetAllMocks());

  it('marks all OPEN alerts for the owner and returns the updated count', async () => {
    repository.markAllRead.mockResolvedValue(4);

    await expect(useCase.execute('owner')).resolves.toEqual({ updated: 4 });
    expect(repository.markAllRead).toHaveBeenCalledWith('owner', undefined);
  });

  it('limits the operation to the requested company', async () => {
    repository.markAllRead.mockResolvedValue(2);

    await expect(useCase.execute('owner', 'company')).resolves.toEqual({
      updated: 2,
    });
    expect(repository.markAllRead).toHaveBeenCalledWith('owner', 'company');
  });
});
