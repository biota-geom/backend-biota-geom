import {
  INestApplication,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentType } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PasswordHasher } from '../src/modules/auth/domain/password-hasher';
import { PrismaService } from '../src/prisma/prisma.service';

/*
 * End-to-end proof of US11: the monthly ESG indicators are upserted (one row
 * per customer + indicator + month), a negative value is refused with 400, and
 * one account can never read or write another account's customer.
 */

const PASSWORD = 'Senha@1234';
const ALICE_EMAIL = 'alice.esg@biotageom.com.br';
const BOB_EMAIL = 'bob.esg@biotageom.com.br';
const SEPTEMBER = new Date('2026-09-01T00:00:00.000Z');

describe('ESG indicators (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let aliceToken: string;
  let bobToken: string;
  let aliceCustomerId: string;

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

  const indicatorsPath = (month: string) =>
    `/customers/${aliceCustomerId}/esg-indicators/${month}`;

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
      'TRUNCATE TABLE "esg_indicator_record", "customers", "customer_address", "users" RESTART IDENTITY CASCADE',
    );

    const alice = await createUser(ALICE_EMAIL, 'Alice Consultoria');
    await createUser(BOB_EMAIL, 'Bob Consultoria');
    aliceToken = await login(ALICE_EMAIL);
    bobToken = await login(BOB_EMAIL);

    const customer = await prisma.customer.create({
      data: {
        name: 'Empresa da Alice',
        document: '12345678000195',
        documentType: DocumentType.CNPJ,
        ownerName: 'Ana Silva',
        ownerEmail: 'ana.silva@empresa.com.br',
        ownerUserId: alice.id,
      },
    });
    aliceCustomerId = customer.id;
  });

  beforeEach(async () => {
    await prisma.esgIndicatorRecord.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns null for every indicator of a month without records', async () => {
    const response = await get(indicatorsPath('2026-09'), aliceToken).expect(
      200,
    );

    expect(response.body).toEqual({
      water: null,
      waste: null,
      employees: null,
      energy: null,
    });
  });

  it('saves a month and returns the same values when it is reopened', async () => {
    const body = { water: 1250.5, waste: 12.3, employees: 148, energy: 53200 };

    await put(indicatorsPath('2026-09'), aliceToken, body).expect(200);
    const reopened = await get(indicatorsPath('2026-09'), aliceToken).expect(
      200,
    );

    expect(reopened.body).toEqual(body);
    // Another month is not affected.
    const august = await get(indicatorsPath('2026-08'), aliceToken).expect(200);
    expect(august.body).toEqual({
      water: null,
      waste: null,
      employees: null,
      energy: null,
    });
  });

  it('keeps one record per indicator when the same month is saved twice', async () => {
    await put(indicatorsPath('2026-09'), aliceToken, {
      water: 1,
      waste: 2,
      employees: 3,
      energy: 4,
    }).expect(200);
    await put(indicatorsPath('2026-09'), aliceToken, {
      water: 10,
      waste: 20,
      employees: 30,
      energy: 40,
    }).expect(200);

    expect(await countRecords(aliceCustomerId)).toBe(4);

    const stored = await get(indicatorsPath('2026-09'), aliceToken).expect(200);
    expect(stored.body).toEqual({
      water: 10,
      waste: 20,
      employees: 30,
      energy: 40,
    });
  });

  it('accepts a partial month, leaves omitted fields alone and clears with null', async () => {
    await put(indicatorsPath('2026-09'), aliceToken, { water: 5 }).expect(200);
    await put(indicatorsPath('2026-09'), aliceToken, { waste: 7 }).expect(200);

    const both = await get(indicatorsPath('2026-09'), aliceToken).expect(200);
    expect(both.body).toEqual({
      water: 5,
      waste: 7,
      employees: null,
      energy: null,
    });

    await put(indicatorsPath('2026-09'), aliceToken, { water: null }).expect(
      200,
    );
    expect(await countRecords(aliceCustomerId)).toBe(1);
  });

  it('refuses invalid values with 400 and stores nothing', async () => {
    await put(indicatorsPath('2026-09'), aliceToken, {
      water: -1,
      waste: 2,
    }).expect(400);
    await put(indicatorsPath('2026-09'), aliceToken, {
      employees: 10.5,
    }).expect(400);
    await put(indicatorsPath('2026-09'), aliceToken, { energy: '10' }).expect(
      400,
    );

    expect(await countRecords(aliceCustomerId)).toBe(0);
  });

  it('refuses a malformed month or customer id with 400', async () => {
    await get(indicatorsPath('2026-13'), aliceToken).expect(400);
    await put(indicatorsPath('2026-9'), aliceToken, { water: 1 }).expect(400);
    await get(
      '/customers/not-a-uuid/esg-indicators/2026-09',
      aliceToken,
    ).expect(400);
  });

  it('answers 404 for a customer of another account, reading or writing', async () => {
    await get(indicatorsPath('2026-09'), bobToken).expect(404);
    await put(indicatorsPath('2026-09'), bobToken, { water: 1 }).expect(404);

    expect(await countRecords(aliceCustomerId)).toBe(0);
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .get(`/api${indicatorsPath('2026-09')}`)
      .expect(401);
  });
});
