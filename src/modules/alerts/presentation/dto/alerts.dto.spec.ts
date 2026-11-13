import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListAlertsQueryDto } from './list-alerts-query.dto';
import { UpdateAlertStatusDto } from './update-alert-status.dto';
import { toAlertResponse } from './alert-response.dto';
import { Alert } from '../../domain/alert.entity';
import { ALERT_MESSAGES } from '../../../auth/presentation/messages/auth.messages.pt-br';

describe('Alert DTOs', () => {
  it('defaults to pending alerts and a ten-item first page', async () => {
    const query = plainToInstance(ListAlertsQueryDto, {});
    expect(await validate(query)).toEqual([]);
    expect(query).toEqual({ status: ['OPEN', 'READ'], page: 1, page_size: 10 });
  });

  it('parses comma-separated statuses and numeric pagination', async () => {
    const query = plainToInstance(ListAlertsQueryDto, {
      status: 'READ, RESOLVED',
      page: '2',
      page_size: '100',
    });
    expect(await validate(query)).toEqual([]);
    expect(query).toEqual({
      status: ['READ', 'RESOLVED'],
      page: 2,
      page_size: 100,
    });
  });

  it.each([
    { status: '' },
    { status: 'UNKNOWN' },
    { status: 'OPEN,' },
    { page: '0' },
    { page: '1.5' },
    { page: 'abc' },
    { page_size: '0' },
    { page_size: '101' },
    { page_size: '-1' },
  ])('rejects invalid queries: %j', async (query) => {
    expect(
      (await validate(plainToInstance(ListAlertsQueryDto, query))).length,
    ).toBeGreaterThan(0);
  });

  it.each(['OPEN', 'UNKNOWN', null, undefined])(
    'rejects unsupported update status %s',
    async (status) => {
      expect(
        (await validate(plainToInstance(UpdateAlertStatusDto, { status })))
          .length,
      ).toBeGreaterThan(0);
    },
  );

  const now = new Date('2026-11-12T00:00:00.000Z');
  const alert: Alert = {
    id: 'alert',
    type: 'CONDITION_DUE',
    severity: 'HIGH',
    status: 'OPEN',
    dueDate: new Date('2026-11-17T00:00:00.000Z'),
    createdAt: now,
    customer: { id: 'customer', name: 'Site' },
    license: { id: 'license', type: 'LO', processNumber: '123/2024' },
    condition: { id: 'condition', name: 'Monitoring' },
  };

  it('does not call a high-risk future condition overdue', () => {
    const response = toAlertResponse(alert, now);
    expect(response.title).toBe(ALERT_MESSAGES.CONDITION_DUE(5));
    expect(response.message).toBe(
      ALERT_MESSAGES.CONDITION_MESSAGE('Monitoring', 'LO 123/2024'),
    );
    expect(response.license.process_number).toBe('123/2024');
    expect(response.due_date).toBe('2026-11-17T00:00:00.000Z');
  });

  it('formats expired conditions, reminders and the due day', () => {
    expect(
      toAlertResponse({ ...alert, dueDate: new Date('2026-11-10') }, now).title,
    ).toBe(ALERT_MESSAGES.CONDITION_EXPIRED);
    expect(toAlertResponse({ ...alert, severity: 'LOW' }, now).title).toBe(
      ALERT_MESSAGES.CONDITION_REMINDER,
    );
    expect(toAlertResponse({ ...alert, dueDate: now }, now).title).toBe(
      ALERT_MESSAGES.CONDITION_DUE(0),
    );
  });

  it('formats licenses without a condition', () => {
    const licenseAlert: Alert = {
      ...alert,
      type: 'LICENSE_EXPIRATION',
      condition: null,
    };
    expect(toAlertResponse(licenseAlert, now)).toMatchObject({
      title: ALERT_MESSAGES.LICENSE_EXPIRED,
      message: 'LO 123/2024',
      condition: null,
    });
    expect(
      toAlertResponse({ ...licenseAlert, severity: 'MEDIUM' }, now).title,
    ).toBe(ALERT_MESSAGES.LICENSE_DUE(5));
  });
});
