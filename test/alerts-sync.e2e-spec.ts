import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TokenService } from '../src/modules/auth/domain/token-service';

const DAY = 24 * 60 * 60 * 1000;

describe('Alerts sync for conditions (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let token: string;
  const ownerId = randomUUID();
  const companyId = randomUUID();
  const licenseId = randomUUID();
  const archivedLicenseId = randomUUID();
  const dueSoonId = randomUUID();
  const reminderId = randomUUID();
  const fulfilledId = randomUUID();
  const archivedConditionId = randomUUID();
  const inDays = (days: number) => new Date(Date.now() + days * DAY);

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.user.create({
      data: {
        id: ownerId,
        name: 'Sync test',
        email: `${ownerId}@example.test`,
        passwordHash: 'unused',
      },
    });
    await prisma.customer.create({
      data: {
        id: companyId,
        ownerUserId: ownerId,
        name: 'Sync site',
        document: companyId,
        documentType: 'CNPJ',
        ownerName: 'Contact',
        ownerEmail: 'contact@example.test',
      },
    });
    for (const [id, status] of [
      [licenseId, 'REGULAR'],
      [archivedLicenseId, 'ARCHIVED'],
    ] as const) {
      await prisma.license.create({
        data: {
          id,
          customerId: companyId,
          type: 'LO',
          processNumber: '321/2026',
          issueDate: new Date('2025-01-01'),
          expirationDate: inDays(365),
          status,
          documentUrl: 'https://example.test/license.pdf',
          issuingAgency: 'Agency',
        },
      });
    }
    await prisma.licenseCondition.createMany({
      data: [
        { id: dueSoonId, licenseId, dueDate: inDays(5) },
        {
          id: reminderId,
          licenseId,
          dueDate: inDays(60),
          alertDate: inDays(0),
        },
        {
          id: fulfilledId,
          licenseId,
          dueDate: inDays(5),
          conditionStatus: 'FULFILLED' as const,
        },
        {
          id: archivedConditionId,
          licenseId: archivedLicenseId,
          dueDate: inDays(5),
        },
      ].map((condition) => ({
        name: 'Relatório',
        environmentalDescriptor: 'Resíduos',
        ...condition,
      })),
    });
    token = await app.get(TokenService).issueAccessToken(ownerId);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.customer.deleteMany({ where: { id: companyId } });
      await prisma.user.deleteMany({ where: { id: ownerId } });
    }
    await app?.close();
  });

  const sync = () =>
    request(app.getHttpServer())
      .post('/api/alerts/sync')
      .set('Authorization', `Bearer ${token}`);

  const conditionAlerts = () =>
    prisma.alert.findMany({
      where: { customerId: companyId, type: 'CONDITION_DUE' },
      select: { licenseConditionId: true, severity: true, status: true },
      orderBy: { createdAt: 'asc' },
    });

  it('creates HIGH and LOW condition alerts and skips fulfilled or archived ones', async () => {
    await sync().expect(200);

    expect(await conditionAlerts()).toEqual(
      expect.arrayContaining([
        { licenseConditionId: dueSoonId, severity: 'HIGH', status: 'OPEN' },
        { licenseConditionId: reminderId, severity: 'LOW', status: 'OPEN' },
      ]),
    );
    expect(await conditionAlerts()).toHaveLength(2);
  });

  it('is idempotent', async () => {
    const response = await sync().expect(200);
    expect(response.body).toEqual({ created: 0, resolved: 0 });
  });

  it('resolves the reminder when the severity rises', async () => {
    await prisma.licenseCondition.update({
      where: { id: reminderId },
      data: { dueDate: inDays(20) },
    });

    const response = await sync().expect(200);

    expect(response.body).toEqual({ created: 1, resolved: 1 });
    const reminderAlerts = (await conditionAlerts()).filter(
      (alert) => alert.licenseConditionId === reminderId,
    );
    expect(reminderAlerts).toEqual([
      { licenseConditionId: reminderId, severity: 'LOW', status: 'RESOLVED' },
      { licenseConditionId: reminderId, severity: 'MEDIUM', status: 'OPEN' },
    ]);
  });
});
