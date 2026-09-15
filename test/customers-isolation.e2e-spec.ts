import {
  INestApplication,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AddressType, DocumentType } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PasswordHasher } from '../src/modules/auth/domain/password-hasher';
import { AUTH_MESSAGES } from '../src/modules/auth/presentation/messages/auth.messages.pt-br';
import { PrismaService } from '../src/prisma/prisma.service';

/*
 * End-to-end proof of the multi-tenant rule (US01/US03/US10): two accounts, one
 * database, and nothing of one reachable through the other. Everything goes
 * through real HTTP with real tokens — the isolation lives in the SQL the
 * repository emits, so mocking the repository would test nothing here.
 */

const PASSWORD = 'Senha@1234';
const ALICE_EMAIL = 'alice.consultoria@biotageom.com.br';
const BOB_EMAIL = 'bob.consultoria@biotageom.com.br';
const NEWCOMER_EMAIL = 'newcomer.consultoria@biotageom.com.br';

// CNPJs with valid check digits — the create DTO verifies them.
const ALICE_DOCUMENT = '12345678000195';
const BOB_DOCUMENT = '23456789000195';
const SHARED_DOCUMENT = '34567890000130';

describe('Customers multi-tenant isolation (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let sectorId: string;
  let aliceToken: string;
  let bobToken: string;
  let aliceCustomerId: string;
  let bobCustomerId: string;

  function companyPayload(overrides: Record<string, unknown> = {}) {
    return {
      name: 'Unidade Industrial',
      document: ALICE_DOCUMENT,
      document_type: DocumentType.CNPJ,
      sector_id: sectorId,
      email: 'contato@unidade.com.br',
      owner_name: 'Ana Silva',
      owner_email: 'ana.silva@unidade.com.br',
      owner_phone: '+55 51 99999-0000',
      address: {
        type: AddressType.BILLING,
        street: 'Av. Assis Brasil',
        number: '123',
        city: 'Porto Alegre',
        state: 'RS',
        postal_code: '91010-000',
        country_code: 'BR',
      },
      ...overrides,
    };
  }

  async function createUser(email: string, name: string): Promise<void> {
    const hasher = app.get(PasswordHasher);

    await prisma.user.create({
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

  function get(path: string, token: string) {
    return request(app.getHttpServer())
      .get(`/api${path}`)
      .set('Authorization', `Bearer ${token}`);
  }

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
      'TRUNCATE TABLE "customer_esg_metrics", "customers", "customer_address", "esg_metric", "sectors", "users" RESTART IDENTITY CASCADE',
    );

    const sector = await prisma.sector.create({
      data: { name: 'Mineração', description: 'Extração mineral.' },
    });
    sectorId = sector.id;

    await createUser(ALICE_EMAIL, 'Alice Consultoria');
    await createUser(BOB_EMAIL, 'Bob Consultoria');
    aliceToken = await login(ALICE_EMAIL);
    bobToken = await login(BOB_EMAIL);

    const alicePost = await request(app.getHttpServer())
      .post('/api/customers')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send(
        companyPayload({ name: 'Empresa da Alice', document: ALICE_DOCUMENT }),
      )
      .expect(201);
    aliceCustomerId = (alicePost.body as { id: string }).id;

    const bobPost = await request(app.getHttpServer())
      .post('/api/customers')
      .set('Authorization', `Bearer ${bobToken}`)
      .send(companyPayload({ name: 'Empresa do Bob', document: BOB_DOCUMENT }))
      .expect(201);
    bobCustomerId = (bobPost.body as { id: string }).id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('stores the owner taken from the token, not from the payload', async () => {
    const alice = await prisma.user.findUniqueOrThrow({
      where: { email: ALICE_EMAIL },
    });
    const customer = await prisma.customer.findUniqueOrThrow({
      where: { id: aliceCustomerId },
    });

    expect(customer.ownerUserId).toBe(alice.id);
  });

  it('lists only the companies of the authenticated account', async () => {
    const aliceList = await get('/customers', aliceToken).expect(200);
    const bobList = await get('/customers', bobToken).expect(200);

    const aliceIds = (aliceList.body as { id: string }[]).map((c) => c.id);
    const bobIds = (bobList.body as { id: string }[]).map((c) => c.id);

    expect(aliceIds).toContain(aliceCustomerId);
    expect(aliceIds).not.toContain(bobCustomerId);
    expect(bobIds).toContain(bobCustomerId);
    expect(bobIds).not.toContain(aliceCustomerId);
  });

  it('starts a brand-new account with an empty portfolio', async () => {
    await createUser(NEWCOMER_EMAIL, 'Newcomer Consultoria');
    const token = await login(NEWCOMER_EMAIL);

    const response = await get('/customers', token).expect(200);

    expect(response.body).toEqual([]);
  });

  /*
   * 404 and not 403: the two answers must be indistinguishable, otherwise a
   * client can walk a list of ids and learn which ones exist in other tenants.
   */
  it('answers 404, not 403, for a company owned by someone else', async () => {
    const response = await get(
      `/customers/${aliceCustomerId}`,
      bobToken,
    ).expect(404);

    expect((response.body as { message: string }).message).toBe(
      AUTH_MESSAGES.CUSTOMER_NOT_FOUND,
    );

    const unknownId = '00000000-0000-4000-8000-000000000000';
    const unknown = await get(`/customers/${unknownId}`, bobToken).expect(404);

    // Byte-for-byte the same answer as "exists, but is not yours".
    expect(unknown.body).toEqual(response.body);
  });

  it('refuses to update a company owned by someone else', async () => {
    await request(app.getHttpServer())
      .put(`/api/customers/${aliceCustomerId}`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ name: 'Sequestrada pelo Bob' })
      .expect(404);

    const customer = await prisma.customer.findUniqueOrThrow({
      where: { id: aliceCustomerId },
    });
    expect(customer.name).toBe('Empresa da Alice');
  });

  it('refuses to delete a company owned by someone else', async () => {
    await request(app.getHttpServer())
      .delete(`/api/customers/${aliceCustomerId}`)
      .set('Authorization', `Bearer ${bobToken}`)
      .expect(404);

    const customer = await prisma.customer.findUniqueOrThrow({
      where: { id: aliceCustomerId },
    });
    expect(customer.isDeleted).toBe(false);
  });

  it('scopes the ESG metric routes of a company to its owner', async () => {
    await get(`/customers/${aliceCustomerId}/esg-metrics`, bobToken).expect(
      404,
    );

    await request(app.getHttpServer())
      .post(`/api/customers/${aliceCustomerId}/esg-metrics`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ metric_ids: [] })
      .expect(404);

    await get(`/customers/${aliceCustomerId}/esg-metrics`, aliceToken).expect(
      200,
    );
  });

  /*
   * US01 checks a duplicate CNPJ against the logged-in client's own portfolio.
   * Two consultancies serving the same company is legitimate; the same
   * consultancy registering it twice is not.
   */
  describe('CNPJ uniqueness is per owner', () => {
    it('accepts the same document under two different owners', async () => {
      await request(app.getHttpServer())
        .post('/api/customers')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send(
          companyPayload({
            name: 'Compartilhada (Alice)',
            document: SHARED_DOCUMENT,
          }),
        )
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/customers')
        .set('Authorization', `Bearer ${bobToken}`)
        .send(
          companyPayload({
            name: 'Compartilhada (Bob)',
            document: SHARED_DOCUMENT,
          }),
        )
        .expect(201);
    });

    it('rejects a document the same owner already registered', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/customers')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send(
          companyPayload({
            name: 'Compartilhada de novo (Alice)',
            document: SHARED_DOCUMENT,
          }),
        )
        .expect(409);

      expect((response.body as { message: string }).message).toBe(
        AUTH_MESSAGES.CUSTOMER_DOCUMENT_ALREADY_EXISTS,
      );
    });
  });
});
