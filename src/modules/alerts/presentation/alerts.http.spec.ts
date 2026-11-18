import {
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import {
  ALERT_MESSAGES,
  AUTH_MESSAGES,
} from '../../auth/presentation/messages/auth.messages.pt-br';
import { ListAlertsUseCase } from '../application/list-alerts.use-case';
import { CountUnreadAlertsUseCase } from '../application/count-unread-alerts.use-case';
import { UpdateAlertStatusUseCase } from '../application/update-alert-status.use-case';
import { MarkAllAlertsReadUseCase } from '../application/mark-all-alerts-read.use-case';
import { Alert } from '../domain/alert.entity';
import { AlertsRepository } from '../domain/alerts.repository';
import { AlertsController } from './alerts.controller';

// Exercise the real controller, validation, use cases and exception filter.
// Database-level tenant isolation is additionally covered by alerts.e2e-spec.ts.
describe('Alerts HTTP contract', () => {
  let app: INestApplication<App>;
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
  const alert: Alert = {
    id: '705e846a-12cd-4591-a060-8b07326c7528',
    type: 'LICENSE_EXPIRATION',
    severity: 'HIGH',
    status: 'OPEN',
    dueDate: new Date('2026-01-01'),
    createdAt: new Date('2025-12-01'),
    customer: { id: 'company', name: 'Site' },
    license: { id: 'license', type: 'LO', processNumber: '123/2024' },
    condition: null,
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AlertsController],
      providers: [
        ListAlertsUseCase,
        CountUnreadAlertsUseCase,
        UpdateAlertStatusUseCase,
        MarkAllAlertsReadUseCase,
        { provide: AlertsRepository, useValue: repository },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          context.switchToHttp().getRequest<{ user: { id: string } }>().user = {
            id: 'owner',
          };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });
  beforeEach(() => jest.resetAllMocks());
  afterAll(() => app.close());

  it('uses default filters and serializes the paginated response', async () => {
    repository.list.mockResolvedValue({
      items: [alert],
      total: 1,
      page: 1,
      pageSize: 10,
    });
    const response = await request(app.getHttpServer())
      .get('/api/alerts')
      .expect(200);
    expect(repository.list).toHaveBeenCalledWith('owner', {
      status: ['OPEN', 'READ'],
      customerId: undefined,
      type: undefined,
      severity: undefined,
      page: 1,
      pageSize: 10,
    });
    expect(response.body).toEqual({
      items: [
        {
          id: alert.id,
          type: alert.type,
          severity: 'HIGH',
          status: 'OPEN',
          title: ALERT_MESSAGES.LICENSE_EXPIRED,
          message: 'LO 123/2024',
          due_date: alert.dueDate.toISOString(),
          created_at: alert.createdAt.toISOString(),
          customer: alert.customer,
          license: { id: 'license', type: 'LO', process_number: '123/2024' },
          condition: null,
        },
      ],
      total: 1,
      page: 1,
      page_size: 10,
    });
  });

  it('forwards explicit filters and preserves totals on empty pages', async () => {
    repository.list.mockResolvedValue({
      items: [],
      total: 20,
      page: 3,
      pageSize: 10,
    });
    const response = await request(app.getHttpServer())
      .get('/api/alerts?status=RESOLVED&page=3&page_size=10')
      .expect(200);
    expect(repository.list).toHaveBeenCalledWith('owner', {
      status: ['RESOLVED'],
      customerId: undefined,
      type: undefined,
      severity: undefined,
      page: 3,
      pageSize: 10,
    });
    expect(response.body).toEqual({
      items: [],
      total: 20,
      page: 3,
      page_size: 10,
    });
  });

  it('forwards customer, type and multiple severity filters', async () => {
    repository.list.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });
    await request(app.getHttpServer())
      .get(
        '/api/alerts?status=READ,RESOLVED&customer_id=705e846a-12cd-4591-a060-8b07326c7528&type=CONDITION_DUE&severity=HIGH,MEDIUM',
      )
      .expect(200);
    expect(repository.list).toHaveBeenCalledWith('owner', {
      status: ['READ', 'RESOLVED'],
      customerId: '705e846a-12cd-4591-a060-8b07326c7528',
      type: ['CONDITION_DUE'],
      severity: ['HIGH', 'MEDIUM'],
      page: 1,
      pageSize: 10,
    });
  });

  it('marks all OPEN alerts as read and returns the affected count', async () => {
    repository.markAllRead.mockResolvedValue(4);
    const response = await request(app.getHttpServer())
      .post(
        '/api/alerts/read-all?customer_id=705e846a-12cd-4591-a060-8b07326c7528',
      )
      .expect(200);
    expect(repository.markAllRead).toHaveBeenCalledWith(
      'owner',
      '705e846a-12cd-4591-a060-8b07326c7528',
    );
    expect(response.body).toEqual({ updated: 4 });
  });

  it.each([0, 3])(
    'returns unread count %i for the authenticated owner',
    async (count) => {
      repository.countUnread.mockResolvedValue(count);
      const response = await request(app.getHttpServer())
        .get('/api/alerts/unread-count')
        .expect(200);
      expect(repository.countUnread).toHaveBeenCalledWith('owner');
      expect(response.body).toEqual({ count });
    },
  );

  it.each(['READ', 'RESOLVED'] as const)(
    'updates to %s and returns the updated notification',
    async (status) => {
      repository.updateStatus.mockResolvedValue({ ...alert, status });
      const response = await request(app.getHttpServer())
        .patch(`/api/alerts/${alert.id}`)
        .send({ status })
        .expect(200);
      expect(repository.updateStatus).toHaveBeenCalledWith(
        'owner',
        alert.id,
        status,
      );
      expect(response.body).toMatchObject({
        id: alert.id,
        status,
        title: ALERT_MESSAGES.LICENSE_EXPIRED,
      });
    },
  );

  it('maps an inaccessible or missing alert to the same 404', async () => {
    repository.updateStatus.mockResolvedValue(null);
    const response = await request(app.getHttpServer())
      .patch(`/api/alerts/${alert.id}`)
      .send({ status: 'READ' })
      .expect(404);
    expect(response.body).toEqual({
      statusCode: 404,
      error: 'Not Found',
      message: ALERT_MESSAGES.NOT_FOUND,
    });
  });

  it('rejects invalid UUIDs before invoking the use case', async () => {
    const response = await request(app.getHttpServer())
      .patch('/api/alerts/invalid')
      .send({ status: 'READ' })
      .expect(400);
    expect(response.body).toMatchObject({
      message: AUTH_MESSAGES.INVALID_REQUEST,
    });
    expect(repository.updateStatus).not.toHaveBeenCalled();
  });

  it('rejects invalid alert filters and read-all customer ids', async () => {
    for (const query of [
      '?customer_id=invalid',
      '?type=NEW_LEGISLATION',
      '?severity=CRITICAL',
      '?severity=HIGH,',
    ]) {
      await request(app.getHttpServer()).get(`/api/alerts${query}`).expect(400);
    }
    await request(app.getHttpServer())
      .post('/api/alerts/read-all?customer_id=invalid')
      .expect(400);
    expect(repository.markAllRead).not.toHaveBeenCalled();
  });

  it('rejects unsupported statuses and ownership fields before writing', async () => {
    for (const body of [
      { status: 'OPEN' },
      { status: 'READ', ownerUserId: 'another' },
      {},
    ]) {
      await request(app.getHttpServer())
        .patch(`/api/alerts/${alert.id}`)
        .send(body)
        .expect(400);
    }
    expect(repository.updateStatus).not.toHaveBeenCalled();
  });
});
