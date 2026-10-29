import {
  INestApplication,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentType, EsgPillar } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PasswordHasher } from '../src/modules/auth/domain/password-hasher';
import { EsgIndicatorsSummaryResponseDto } from '../src/modules/esg-indicators/presentation/dto/esg-indicators-summary-response.dto';
import { PrismaService } from '../src/prisma/prisma.service';

/*
 * End-to-end proof of US11: each customer reports only its own indicators, a
 * new one can be created inline, the monthly values are upserted (one row per
 * customer + indicator + month), a negative value is refused with 400, and one
 * account can never read or write another account's customer.
 */

const PASSWORD = 'Senha@1234';
const ALICE_EMAIL = 'alice.esg@biotageom.com.br';
const BOB_EMAIL = 'bob.esg@biotageom.com.br';
// Test-only catalog entries carry this prefix so they can be cleaned up.
const METRIC_PREFIX = 'E2E ESG';
const SEPTEMBER = new Date('2026-09-01T00:00:00.000Z');

describe('ESG indicators (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let aliceToken: string;
  let bobToken: string;
  let aliceId: string;
  let customerAId: string;
  let customerBId: string;
  let water: { id: string };
  let waste: { id: string };
  let staff: { id: string };

  interface IndicatorItem {
    indicator_id: string;
    name: string;
    unit: string;
    category: string;
    value: number | null;
  }

  async function createUser(email: string, name: string) {
    const hasher = app.get(PasswordHasher);

    return prisma.user.create({
      data: { name, email, passwordHash: await hasher.hash(PASSWORD) },
    });
  }

  async function login(email: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);

    return (response.body as { access_token: string }).access_token;
  }

  function put(path: string, token: string, body: Record<string, unknown>) {
    return request(app.getHttpServer())
      .put(`/api${path}`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  }

  function post(path: string, token: string, body: Record<string, unknown>) {
    return request(app.getHttpServer())
      .post(`/api${path}`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  }

  function get(path: string, token: string) {
    return request(app.getHttpServer())
      .get(`/api${path}`)
      .set('Authorization', `Bearer ${token}`);
  }

  function countRecords(customerId: string, referenceMonth = SEPTEMBER) {
    return prisma.esgIndicatorRecord.count({
      where: { customerId, referenceMonth },
    });
  }

  async function createCustomer(name: string, document: string) {
    return prisma.customer.create({
      data: {
        name,
        document,
        documentType: DocumentType.CNPJ,
        ownerName: 'Ana Silva',
        ownerEmail: 'ana.silva@empresa.com.br',
        ownerUserId: aliceId,
      },
    });
  }

  function createMetric(name: string, unit: string, pillar: EsgPillar) {
    return prisma.esgMetric.create({ data: { name, unit, pillar } });
  }

  const link = (customerId: string, esgMetricId: string) =>
    prisma.customerEsgMetric.create({ data: { customerId, esgMetricId } });

  const indicatorsPath = (customerId: string, month: string) =>
    `/customers/${customerId}/esg-indicators/${month}`;
  const monthA = (month: string) => indicatorsPath(customerAId, month);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api', {
      exclude: [{ path: '/', method: RequestMethod.GET }],
    });
    // Same pipe main.ts installs, so the DTOs behave as they do in production.
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "esg_indicator_record", "customer_esg_metrics", "customers", "customer_address", "users" RESTART IDENTITY CASCADE',
    );
    await prisma.esgMetric.deleteMany({
      where: { name: { startsWith: METRIC_PREFIX } },
    });

    const alice = await createUser(ALICE_EMAIL, 'Alice Consultoria');
    await createUser(BOB_EMAIL, 'Bob Consultoria');
    aliceId = alice.id;
    aliceToken = await login(ALICE_EMAIL);
    bobToken = await login(BOB_EMAIL);

    // Company A reports 3 indicators, company B reports 2 different ones.
    customerAId = (await createCustomer('Empresa A', '12345678000195')).id;
    customerBId = (await createCustomer('Empresa B', '98765432000110')).id;

    water = await createMetric(
      `${METRIC_PREFIX} Água`,
      'm³',
      EsgPillar.AMBIENTAL,
    );
    waste = await createMetric(
      `${METRIC_PREFIX} Resíduos`,
      't',
      EsgPillar.AMBIENTAL,
    );
    staff = await createMetric(
      `${METRIC_PREFIX} Colaboradores`,
      'un',
      EsgPillar.SOCIAL,
    );
    const co2 = await createMetric(
      `${METRIC_PREFIX} CO2`,
      'tCO2e',
      EsgPillar.AMBIENTAL,
    );
    const training = await createMetric(
      `${METRIC_PREFIX} Treinamento`,
      'h',
      EsgPillar.SOCIAL,
    );

    await link(customerAId, water.id);
    await link(customerAId, waste.id);
    await link(customerAId, staff.id);
    await link(customerBId, co2.id);
    await link(customerBId, training.id);
  });

  beforeEach(async () => {
    await prisma.esgIndicatorRecord.deleteMany();
  });

  afterAll(async () => {
    await prisma.esgIndicatorRecord.deleteMany();
    await prisma.customerEsgMetric.deleteMany({
      where: { customerId: { in: [customerAId, customerBId] } },
    });
    await prisma.esgMetric.deleteMany({
      where: { name: { startsWith: METRIC_PREFIX } },
    });
    await app.close();
  });

  it('lists only the indicators configured for each company, empty month as null', async () => {
    const a = await get(monthA('2026-09'), aliceToken).expect(200);
    const b = await get(
      indicatorsPath(customerBId, '2026-09'),
      aliceToken,
    ).expect(200);

    const itemsA = a.body as IndicatorItem[];
    const itemsB = b.body as IndicatorItem[];

    expect(itemsA.map((item) => item.name).sort()).toEqual([
      `${METRIC_PREFIX} Colaboradores`,
      `${METRIC_PREFIX} Resíduos`,
      `${METRIC_PREFIX} Água`,
    ]);
    expect(itemsB.map((item) => item.name).sort()).toEqual([
      `${METRIC_PREFIX} CO2`,
      `${METRIC_PREFIX} Treinamento`,
    ]);
    expect(itemsA.every((item) => item.value === null)).toBe(true);
    expect(itemsA.find((item) => item.indicator_id === water.id)).toEqual({
      indicator_id: water.id,
      name: `${METRIC_PREFIX} Água`,
      unit: 'm³',
      category: 'Ambiental',
      value: null,
    });
    expect(
      itemsA.find((item) => item.indicator_id === staff.id)?.category,
    ).toBe('Social');
  });

  it('saves a month and returns the same values when it is reopened', async () => {
    const saved = await put(monthA('2026-09'), aliceToken, {
      records: [
        { indicator_id: water.id, value: 1250.5 },
        { indicator_id: staff.id, value: 85 },
      ],
    }).expect(200);
    const reopened = await get(monthA('2026-09'), aliceToken).expect(200);

    expect(reopened.body).toEqual(saved.body);
    const byId = new Map(
      (reopened.body as IndicatorItem[]).map((item) => [
        item.indicator_id,
        item.value,
      ]),
    );
    expect(byId.get(water.id)).toBe(1250.5);
    expect(byId.get(waste.id)).toBeNull();
    expect(byId.get(staff.id)).toBe(85);

    // Another month is not affected.
    const august = await get(monthA('2026-08'), aliceToken).expect(200);
    expect(
      (august.body as IndicatorItem[]).every((item) => item.value === null),
    ).toBe(true);
  });

  it('keeps one record per indicator when the same month is saved twice', async () => {
    const records = (factor: number) => ({
      records: [
        { indicator_id: water.id, value: 1 * factor },
        { indicator_id: waste.id, value: 2 * factor },
        { indicator_id: staff.id, value: 3 * factor },
      ],
    });

    await put(monthA('2026-09'), aliceToken, records(1)).expect(200);
    await put(monthA('2026-09'), aliceToken, records(10)).expect(200);

    expect(await countRecords(customerAId)).toBe(3);
    const stored = await get(monthA('2026-09'), aliceToken).expect(200);
    expect(
      (stored.body as IndicatorItem[])
        .map((item) => item.value)
        .sort((x, y) => (x ?? 0) - (y ?? 0)),
    ).toEqual([10, 20, 30]);
  });

  it('accepts a partial month, leaves omitted indicators alone and clears with null', async () => {
    await put(monthA('2026-09'), aliceToken, {
      records: [{ indicator_id: water.id, value: 5 }],
    }).expect(200);
    await put(monthA('2026-09'), aliceToken, {
      records: [{ indicator_id: waste.id, value: 7 }],
    }).expect(200);

    expect(await countRecords(customerAId)).toBe(2);

    await put(monthA('2026-09'), aliceToken, {
      records: [{ indicator_id: water.id, value: null }],
    }).expect(200);
    expect(await countRecords(customerAId)).toBe(1);
  });

  it('creates an indicator inline, lists it right away and lets it receive a value', async () => {
    const created = await post(
      `/customers/${customerAId}/indicators`,
      aliceToken,
      {
        name: `${METRIC_PREFIX} Efluentes`,
        unit: 'm³',
        category: 'Ambiental',
      },
    ).expect(201);

    const item = created.body as IndicatorItem;
    expect(item).toEqual({
      indicator_id: expect.any(String) as string,
      name: `${METRIC_PREFIX} Efluentes`,
      unit: 'm³',
      category: 'Ambiental',
      value: null,
    });

    const listed = await get(monthA('2026-09'), aliceToken).expect(200);
    expect(
      (listed.body as IndicatorItem[]).map((entry) => entry.indicator_id),
    ).toContain(item.indicator_id);

    await put(monthA('2026-09'), aliceToken, {
      records: [{ indicator_id: item.indicator_id, value: 42 }],
    }).expect(200);
    expect(await countRecords(customerAId)).toBe(1);

    // It was not added to the other company.
    const other = await get(
      indicatorsPath(customerBId, '2026-09'),
      aliceToken,
    ).expect(200);
    expect(
      (other.body as IndicatorItem[]).map((entry) => entry.indicator_id),
    ).not.toContain(item.indicator_id);

    // Same name (any case) on the same company is a duplicate...
    await post(`/customers/${customerAId}/indicators`, aliceToken, {
      name: `${METRIC_PREFIX} EFLUENTES`,
      unit: 'm³',
      category: 'Ambiental',
    }).expect(409);

    // ...but another company of the account can reuse the catalog entry.
    const reused = await post(
      `/customers/${customerBId}/indicators`,
      aliceToken,
      {
        name: `${METRIC_PREFIX} Efluentes`,
        unit: 'm³',
        category: 'Ambiental',
      },
    ).expect(201);
    expect((reused.body as IndicatorItem).indicator_id).toBe(item.indicator_id);
    expect(
      await prisma.esgMetric.count({
        where: { name: `${METRIC_PREFIX} Efluentes` },
      }),
    ).toBe(1);
  });

  it('refuses an invalid new indicator with 400', async () => {
    await post(`/customers/${customerAId}/indicators`, aliceToken, {
      name: '',
      unit: 'L',
      category: 'Ambiental',
    }).expect(400);
    await post(`/customers/${customerAId}/indicators`, aliceToken, {
      name: `${METRIC_PREFIX} X`,
      unit: 'L',
      category: 'Outra',
    }).expect(400);
  });

  it('refuses invalid values with 400 and stores nothing', async () => {
    await put(monthA('2026-09'), aliceToken, {
      records: [
        { indicator_id: water.id, value: -1 },
        { indicator_id: waste.id, value: 2 },
      ],
    }).expect(400);
    await put(monthA('2026-09'), aliceToken, {
      records: [{ indicator_id: waste.id, value: '10' }],
    }).expect(400);
    await put(monthA('2026-09'), aliceToken, {
      records: [{ indicator_id: 'x', value: 1 }],
    }).expect(400);
    await put(monthA('2026-09'), aliceToken, { water: 1 }).expect(400);

    expect(await countRecords(customerAId)).toBe(0);
  });

  it('refuses an indicator of another company or a repeated one, storing nothing', async () => {
    const foreign = await prisma.esgMetric.findFirstOrThrow({
      where: { name: `${METRIC_PREFIX} CO2` },
    });

    await put(monthA('2026-09'), aliceToken, {
      records: [
        { indicator_id: water.id, value: 1 },
        { indicator_id: foreign.id, value: 2 },
      ],
    }).expect(400);
    await put(monthA('2026-09'), aliceToken, {
      records: [
        { indicator_id: water.id, value: 1 },
        { indicator_id: water.id, value: 2 },
      ],
    }).expect(400);

    expect(await countRecords(customerAId)).toBe(0);
  });

  it('refuses a malformed month or customer id with 400', async () => {
    await get(monthA('2026-13'), aliceToken).expect(400);
    await put(monthA('2026-9'), aliceToken, { records: [] }).expect(400);
    await get(
      '/customers/not-a-uuid/esg-indicators/2026-09',
      aliceToken,
    ).expect(400);
    await post('/customers/not-a-uuid/indicators', aliceToken, {
      name: 'x',
      unit: 'u',
      category: 'Social',
    }).expect(400);
  });

  it('answers 404 for a customer of another account, reading or writing', async () => {
    await get(monthA('2026-09'), bobToken).expect(404);
    await put(monthA('2026-09'), bobToken, {
      records: [{ indicator_id: water.id, value: 1 }],
    }).expect(404);
    await post(`/customers/${customerAId}/indicators`, bobToken, {
      name: `${METRIC_PREFIX} Intruso`,
      unit: 'u',
      category: 'Social',
    }).expect(404);

    expect(await countRecords(customerAId)).toBe(0);
    expect(
      await prisma.esgMetric.count({
        where: { name: `${METRIC_PREFIX} Intruso` },
      }),
    ).toBe(0);
  });

  describe('summary', () => {
    const summaryA = (query = '') =>
      `/customers/${customerAId}/esg-indicators/summary${query}`;

    async function getSummary(query: string, token = aliceToken) {
      const response = await get(summaryA(query), token).expect(200);
      return response.body as EsgIndicatorsSummaryResponseDto;
    }

    // Every indicator linked to company A (other tests may add one inline).
    async function linkedIds(): Promise<string[]> {
      const response = await get(monthA('2026-09'), aliceToken).expect(200);
      return (response.body as IndicatorItem[])
        .map((item) => item.indicator_id)
        .sort();
    }

    const idsOf = (summary: EsgIndicatorsSummaryResponseDto) =>
      summary.indicators.map((item) => item.indicator_id).sort();

    const byId = (summary: EsgIndicatorsSummaryResponseDto, id: string) =>
      summary.indicators.find((item) => item.indicator_id === id);

    it('shows water going from 1000 in August to 1100 in September as +10.0%', async () => {
      await put(monthA('2026-08'), aliceToken, {
        records: [
          { indicator_id: water.id, value: 1000 },
          { indicator_id: staff.id, value: 150 },
        ],
      }).expect(200);
      await put(monthA('2026-09'), aliceToken, {
        records: [
          { indicator_id: water.id, value: 1100 },
          { indicator_id: waste.id, value: 12.3 },
          { indicator_id: staff.id, value: 148 },
        ],
      }).expect(200);

      const summary = await getSummary('?month=2026-09');

      expect(summary.reference_month).toBe('2026-09');
      expect(idsOf(summary)).toEqual(await linkedIds());
      expect(byId(summary, water.id)).toEqual({
        indicator_id: water.id,
        name: `${METRIC_PREFIX} Água`,
        unit: 'm³',
        category: 'Ambiental',
        current: 1100,
        previous: 1000,
        variation_pct: 10,
      });
      expect(byId(summary, waste.id)?.variation_pct).toBeNull();
      expect(byId(summary, staff.id)?.variation_pct).toBe(-1.3);
    });

    it('uses the latest month with a record when no month is given', async () => {
      await put(monthA('2026-07'), aliceToken, {
        records: [{ indicator_id: water.id, value: 800 }],
      }).expect(200);
      await put(monthA('2026-08'), aliceToken, {
        records: [{ indicator_id: water.id, value: 1000 }],
      }).expect(200);

      const summary = await getSummary('');

      expect(summary.reference_month).toBe('2026-08');
      expect(byId(summary, water.id)?.variation_pct).toBe(25);
    });

    it('returns null variations for a month without a previous record', async () => {
      await put(monthA('2026-09'), aliceToken, {
        records: [{ indicator_id: water.id, value: 1100 }],
      }).expect(200);

      const summary = await getSummary('');

      expect(byId(summary, water.id)).toMatchObject({
        current: 1100,
        previous: null,
        variation_pct: null,
      });
    });

    it('lists the indicators empty for a company without records', async () => {
      const summary = await getSummary('');

      expect(summary.reference_month).toBeNull();
      expect(idsOf(summary)).toEqual(await linkedIds());
      expect(summary.indicators.every((item) => item.current === null)).toBe(
        true,
      );
    });

    it('refuses a malformed month with 400 and another account with 404', async () => {
      await get(summaryA('?month=2026-13'), aliceToken).expect(400);
      await get(summaryA(), bobToken).expect(404);
    });
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .get(`/api${monthA('2026-09')}`)
      .expect(401);
    await request(app.getHttpServer())
      .post(`/api/customers/${customerAId}/indicators`)
      .send({})
      .expect(401);
  });
});
