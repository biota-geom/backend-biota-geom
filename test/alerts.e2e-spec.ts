import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TokenService } from '../src/modules/auth/domain/token-service';
import { alertDedupeKey } from '../src/modules/alerts/domain/alert-dedupe-key';
import { AlertListResponseDto } from '../src/modules/alerts/presentation/dto/alert-list-response.dto';
import { AlertResponseDto } from '../src/modules/alerts/presentation/dto/alert-response.dto';
import { seedAlerts } from '../prisma/seed-alerts';

describe('Alerts (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let token: string;
  let foreignToken: string;
  const ownerId = randomUUID();
  const foreignOwnerId = randomUUID();
  const companyId = randomUUID();
  const foreignCompanyId = randomUUID();
  const licenseId = randomUUID();
  const foreignLicenseId = randomUUID();
  const highId = randomUUID();
  const laterHighId = randomUUID();
  const mediumId = randomUUID();
  const lowId = randomUUID();
  const resolvedId = randomUUID();
  const foreignId = randomUUID();
  const dueDate = new Date('2026-11-10T00:00:00Z');

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.user.createMany({
      data: [ownerId, foreignOwnerId].map((id) => ({
        id,
        name: 'Alert test',
        email: `${id}@example.test`,
        passwordHash: 'unused',
      })),
    });
    for (const [id, ownerUserId, linkedLicenseId] of [
      [companyId, ownerId, licenseId],
      [foreignCompanyId, foreignOwnerId, foreignLicenseId],
    ]) {
      await prisma.customer.create({
        data: {
          id,
          ownerUserId,
          name: 'Test site',
          document: id,
          documentType: 'CNPJ',
          ownerName: 'Contact',
          ownerEmail: 'contact@example.test',
        },
      });
      await prisma.license.create({
        data: {
          id: linkedLicenseId,
          customerId: id,
          type: 'LO',
          processNumber: '123/2024',
          issueDate: new Date('2025-01-01'),
          expirationDate: dueDate,
          status: 'EXPIRED',
          documentUrl: 'https://example.test/license.pdf',
          issuingAgency: 'Agency',
        },
      });
    }
    await prisma.alert.createMany({
      data: [
        { id: highId, severity: 'HIGH' as const, status: 'OPEN' as const },
        {
          id: laterHighId,
          severity: 'HIGH' as const,
          status: 'OPEN' as const,
          dueDate: new Date('2026-11-20'),
        },
        { id: mediumId, severity: 'MEDIUM' as const, status: 'OPEN' as const },
        { id: lowId, severity: 'LOW' as const, status: 'READ' as const },
        {
          id: resolvedId,
          severity: 'HIGH' as const,
          status: 'RESOLVED' as const,
        },
      ].map((entry) => ({
        type: 'LICENSE_EXPIRATION',
        customerId: companyId,
        licenseId,
        dueDate,
        ...entry,
      })),
    });
    await prisma.alert.create({
      data: {
        id: foreignId,
        type: 'LICENSE_EXPIRATION',
        severity: 'HIGH',
        customerId: foreignCompanyId,
        licenseId: foreignLicenseId,
        dueDate,
      },
    });
    const tokens = app.get(TokenService);
    token = await tokens.issueAccessToken(ownerId);
    foreignToken = await tokens.issueAccessToken(foreignOwnerId);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.customer.deleteMany({
        where: { id: { in: [companyId, foreignCompanyId] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [ownerId, foreignOwnerId] } },
      });
    }
    await app?.close();
  });

  const get = (path: string, bearer = token) =>
    request(app.getHttpServer())
      .get(`/api/alerts${path}`)
      .set('Authorization', `Bearer ${bearer}`);
  const patch = (id: string, body: object) =>
    request(app.getHttpServer())
      .patch(`/api/alerts/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  it('requires authentication', async () => {
    await request(app.getHttpServer()).get('/api/alerts').expect(401);
  });

  it('orders in the database before pagination and scopes totals/counts', async () => {
    const first = await get('?page_size=2').expect(200);
    expect(first.body).toMatchObject({ total: 4, page: 1, page_size: 2 });
    expect(
      (first.body as AlertListResponseDto).items.map((item) => item.id),
    ).toEqual([highId, laterHighId]);
    const second = await get('?page_size=2&page=2').expect(200);
    expect(
      (second.body as AlertListResponseDto).items.map((item) => item.id),
    ).toEqual([mediumId, lowId]);
    expect((await get('/unread-count').expect(200)).body).toEqual({ count: 3 });
    expect(
      (
        (await get('', foreignToken).expect(200)).body as AlertListResponseDto
      ).items.map((item: { id: string }) => item.id),
    ).toEqual([foreignId]);
    expect((await get('/unread-count', foreignToken).expect(200)).body).toEqual(
      { count: 1 },
    );
  });

  it('supports explicit resolved filters and empty pages', async () => {
    expect(
      (
        (await get('?status=RESOLVED').expect(200)).body as AlertListResponseDto
      ).items.map((item: { id: string }) => item.id),
    ).toEqual([resolvedId]);
    expect((await get('?page=20').expect(200)).body).toMatchObject({
      items: [],
      total: 4,
    });
  });

  it('does not expose or update another tenant alert', async () => {
    const foreign = await patch(foreignId, { status: 'READ' }).expect(404);
    const missing = await patch(randomUUID(), { status: 'READ' }).expect(404);
    expect(foreign.body).toEqual(missing.body);
    expect(
      (await prisma.alert.findUniqueOrThrow({ where: { id: foreignId } }))
        .status,
    ).toBe('OPEN');
  });

  it('updates status, returns the contract, and immediately decreases unread count', async () => {
    const response = await patch(highId, { status: 'READ' }).expect(200);
    expect(response.body).toMatchObject({
      id: highId,
      status: 'READ',
      condition: null,
      customer: { id: companyId },
      license: { id: licenseId, process_number: '123/2024' },
    });
    expect((response.body as AlertResponseDto).title).toEqual(
      expect.any(String),
    );
    expect((await get('/unread-count').expect(200)).body).toEqual({ count: 2 });
    await patch(highId, { status: 'READ' }).expect(200);
    await patch(highId, { status: 'RESOLVED' }).expect(200);
  });

  it('rejects invalid input and extra properties', async () => {
    for (const query of [
      '?page=0',
      '?page_size=101',
      '?status=UNKNOWN',
      '?status=',
      '?owner_user_id=other',
    ])
      await get(query).expect(400);
    await patch(highId, { status: 'OPEN' }).expect(400);
    await patch(highId, {
      status: 'READ',
      customer_id: foreignCompanyId,
    }).expect(400);
    await patch('invalid-id', { status: 'READ' }).expect(400);
  });

  it('enforces deduplication in PostgreSQL', async () => {
    const dedupeKey = alertDedupeKey(
      'LICENSE_EXPIRATION',
      licenseId,
      'HIGH',
      dueDate,
    );
    await prisma.alert.update({ where: { id: highId }, data: { dedupeKey } });
    await expect(
      prisma.alert.update({ where: { id: laterHighId }, data: { dedupeKey } }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('documents the endpoints and response models', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );
    expect(document.paths['/api/alerts'].get).toBeDefined();
    expect(document.paths['/api/alerts/unread-count'].get).toBeDefined();
    expect(document.paths['/api/alerts/{id}'].patch).toBeDefined();
    expect(document.components?.schemas?.AlertResponseDto).toBeDefined();
  });

  it('seeds conditions idempotently and returns their linked contract', async () => {
    const condition = await prisma.licenseCondition.create({
      data: {
        licenseId,
        name: 'Monitoring',
        environmentalDescriptor: 'Water',
        dueDate: new Date(Date.now() + 45 * 86400000),
      },
    });
    await seedAlerts(prisma, [licenseId]);
    await seedAlerts(prisma, [licenseId]);
    const rows = await prisma.alert.findMany({
      where: { licenseConditionId: condition.id },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ severity: 'LOW', status: 'OPEN' });
    expect(rows[0].dedupeKey).toBe(
      alertDedupeKey('CONDITION_DUE', condition.id, 'LOW', condition.dueDate),
    );
    const response = await patch(rows[0].id, { status: 'READ' }).expect(200);
    expect(response.body).toMatchObject({
      condition: { id: condition.id, name: condition.name },
      license: { id: licenseId },
    });
    await seedAlerts(prisma, [licenseId]);
    expect(
      (await prisma.alert.findUniqueOrThrow({ where: { id: rows[0].id } }))
        .status,
    ).toBe('READ');
    await prisma.licenseCondition.update({
      where: { id: condition.id },
      data: { dueDate: new Date(Date.now() + 5 * 86400000) },
    });
    await seedAlerts(prisma, [licenseId]);
    expect(
      (await prisma.alert.findUniqueOrThrow({ where: { id: rows[0].id } }))
        .status,
    ).toBe('RESOLVED');
    expect(
      await prisma.alert.count({
        where: {
          licenseConditionId: condition.id,
          status: 'OPEN',
          severity: 'HIGH',
        },
      }),
    ).toBe(1);
  });

  it('hides deleted companies consistently', async () => {
    await prisma.customer.update({
      where: { id: companyId },
      data: { isDeleted: true },
    });
    expect((await get('').expect(200)).body).toMatchObject({
      items: [],
      total: 0,
    });
    expect((await get('/unread-count').expect(200)).body).toEqual({ count: 0 });
    await patch(mediumId, { status: 'READ' }).expect(404);
  });
});
