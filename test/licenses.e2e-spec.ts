import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AddressType, DocumentType, EsgPillar } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PasswordHasher } from '../src/modules/auth/domain/password-hasher';
import { LOCAL_STORAGE_URL_PREFIX } from '../src/common/storage/local-disk-file-storage';
import { StorageConfigService } from '../src/common/storage/storage-config.service';
import { PrismaService } from '../src/prisma/prisma.service';

/*
 * Covers the ticket's own test plan end to end, over real HTTP:
 *   - status calculation (Vencida/Atenção/Regular) from expiration_date;
 *   - the uploaded PDF is stored and its document_url is actually servable;
 *   - type/size validation rejects a non-PDF and an over-limit file.
 *
 * No global TRUNCATE here (unlike customers-isolation.e2e-spec.ts): every
 * unique value (email, sector/agency name) is suffixed per run, so this suite
 * can be run repeatedly against the same database and never wipes another
 * suite's fixtures.
 *
 * That does not make it safe to run *concurrently* with that file, which
 * truncates `sectors`/`users`/`customers` in its own setup and would delete
 * the rows created below mid-run. jest-e2e.json therefore sets maxWorkers: 1
 * so the e2e files share the database one at a time.
 */

const PASSWORD = 'Senha@1234';
const VALID_CNPJ = '12345678000195';
const PDF_HEADER = Buffer.from('%PDF-1.4\n%fake license content\n');

function uniqueSuffix(): string {
  return randomUUID().slice(0, 8);
}

describe('Licenses (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let token: string;
  let customerId: string;

  async function createUserAndLogin(): Promise<string> {
    const email = `owner-${uniqueSuffix()}@biotageom.com.br`;
    const hasher = app.get(PasswordHasher);

    await prisma.user.create({
      data: {
        name: 'Dona da Licença',
        email,
        passwordHash: await hasher.hash(PASSWORD),
      },
    });

    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);

    return (response.body as { access_token: string }).access_token;
  }

  // /auth/login is rate limited, so suites that only need "some other owner"
  // share one login instead of each burning a request against the limit.
  let otherOwnerToken: string | undefined;
  async function getOtherOwnerToken(): Promise<string> {
    otherOwnerToken ??= await createUserAndLogin();
    return otherOwnerToken;
  }

  function createLicenseRequest(overrides: Record<string, string> = {}) {
    const fields = {
      type: 'LO',
      process_number: 'LO nº 118/2020',
      issuing_agency: 'FEPAM',
      issue_date: '2015-01-10T00:00:00.000Z',
      expiration_date: '2099-01-10T00:00:00.000Z',
      ...overrides,
    };

    let req = request(app.getHttpServer())
      .post(`/api/customers/${customerId}/licenses`)
      .set('Authorization', `Bearer ${token}`);

    for (const [key, value] of Object.entries(fields)) {
      req = req.field(key, value);
    }

    return req;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    app.setGlobalPrefix('api', {
      exclude: [{ path: '/', method: RequestMethod.GET }],
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    // Same static route main.ts registers — required for the document_url
    // returned by the local storage driver to actually be servable.
    const storageConfig = app.get(StorageConfigService);
    app.useStaticAssets(join(storageConfig.localStorageDir, 'licenses'), {
      prefix: `/${LOCAL_STORAGE_URL_PREFIX}/licenses`,
    });
    await app.init();

    prisma = app.get(PrismaService);

    const sector = await prisma.sector.create({
      data: { name: `Setor Licenças ${uniqueSuffix()}` },
    });
    token = await createUserAndLogin();

    const customerResponse = await request(app.getHttpServer())
      .post('/api/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Empresa com Licenças',
        document: VALID_CNPJ,
        document_type: DocumentType.CNPJ,
        sector_id: sector.id,
        owner_name: 'Responsável Ambiental',
        owner_email: 'responsavel@empresa.com.br',
        address: {
          type: AddressType.BILLING,
          city: 'Porto Alegre',
          state: 'RS',
          country_code: 'BR',
        },
      })
      .expect(201);
    customerId = (customerResponse.body as { id: string }).id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('status calculation', () => {
    it.each([
      ['2020-01-01T00:00:00.000Z', 'Vencida'],
      [
        new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        'Atenção',
      ],
      [
        new Date(Date.now() + 400 * 24 * 60 * 60 * 1000).toISOString(),
        'Regular',
      ],
    ])(
      'stores expiration_date %s as status %s',
      async (expirationDate, expectedStatus) => {
        const response = await createLicenseRequest({
          process_number: `LO nº ${uniqueSuffix()}`,
          expiration_date: expirationDate,
        })
          .attach('document_file', PDF_HEADER, {
            filename: 'licenca.pdf',
            contentType: 'application/pdf',
          })
          .expect(201);

        expect(response.body).toMatchObject({ status: expectedStatus });

        const stored = await prisma.license.findUniqueOrThrow({
          where: { id: (response.body as { id: string }).id },
        });
        expect(stored.status).toBe(
          { Vencida: 'EXPIRED', Atenção: 'ATTENTION', Regular: 'REGULAR' }[
            expectedStatus
          ],
        );
      },
    );
  });

  it('stores the uploaded PDF and serves it back from document_url', async () => {
    const response = await createLicenseRequest({
      process_number: `LO nº ${uniqueSuffix()}`,
    })
      .attach('document_file', PDF_HEADER, {
        filename: 'licenca.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    const documentUrl = (response.body as { document_url: string })
      .document_url;
    // No /api here on purpose: useStaticAssets registers straight on the
    // Express instance, so the served document sits outside the global prefix.
    const path = new URL(documentUrl).pathname;

    const fileResponse = await request(app.getHttpServer())
      .get(path)
      .expect(200);
    expect(Buffer.compare(fileResponse.body as Buffer, PDF_HEADER)).toBe(0);
  });

  describe('GET /licenses/:licenseId/document/url', () => {
    async function createLicenseWithDocument(): Promise<{
      id: string;
      document_url: string;
    }> {
      const response = await createLicenseRequest({
        process_number: `LO nº ${uniqueSuffix()}`,
      })
        .attach('document_file', PDF_HEADER, {
          filename: 'licenca.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);

      return response.body as { id: string; document_url: string };
    }

    it('returns a URL that serves the license PDF', async () => {
      const license = await createLicenseWithDocument();

      const response = await request(app.getHttpServer())
        .get(`/api/licenses/${license.id}/document/url`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Local driver: nothing to sign, so the stored URL comes back as-is.
      expect(response.body).toEqual({
        document_url: license.document_url,
        expires_in: null,
      });

      const fileResponse = await request(app.getHttpServer())
        .get(new URL(license.document_url).pathname)
        .expect(200);
      expect(Buffer.compare(fileResponse.body as Buffer, PDF_HEADER)).toBe(0);
    });

    it("answers 404 for another owner's license (tenant isolation)", async () => {
      const license = await createLicenseWithDocument();
      const otherToken = await getOtherOwnerToken();

      const response = await request(app.getHttpServer())
        .get(`/api/licenses/${license.id}/document/url`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);

      expect((response.body as { message: string }).message).toBe(
        'Licença não encontrada.',
      );
    });

    it('answers 401 without a token', async () => {
      await request(app.getHttpServer())
        .get(`/api/licenses/${randomUUID()}/document/url`)
        .expect(401);
    });

    it('answers 400 for a malformed license id', async () => {
      await request(app.getHttpServer())
        .get('/api/licenses/not-a-uuid/document/url')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });
  });

  it('rejects a non-PDF file with a friendly 422', async () => {
    const response = await createLicenseRequest()
      .attach('document_file', Buffer.from('not a pdf'), {
        filename: 'licenca.jpg',
        contentType: 'image/jpeg',
      })
      .expect(422);

    expect((response.body as { message: string }).message).toBe(
      'O arquivo deve estar no formato PDF.',
    );
  });

  it('rejects a PDF larger than 5MB with a friendly 422', async () => {
    const oversized = Buffer.alloc(5 * 1024 * 1024 + 1, 'a');

    const response = await createLicenseRequest()
      .attach('document_file', oversized, {
        filename: 'licenca-grande.pdf',
        contentType: 'application/pdf',
      })
      .expect(422);

    expect((response.body as { message: string }).message).toBe(
      'O arquivo não pode ultrapassar 5MB.',
    );
  });

  it('answers 404 for a customer owned by another account', async () => {
    const otherToken = await getOtherOwnerToken();

    await createLicenseRequest()
      .set('Authorization', `Bearer ${otherToken}`)
      .attach('document_file', PDF_HEADER, {
        filename: 'licenca.pdf',
        contentType: 'application/pdf',
      })
      .expect(404);
  });

  it('creates a license with free-text type and issuing agency', async () => {
    const response = await createLicenseRequest({
      type: 'LAO',
      issuing_agency: 'Secretaria Municipal do Meio Ambiente',
    })
      .attach('document_file', PDF_HEADER, {
        filename: 'licenca.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      type: 'LAO',
      issuing_agency: 'Secretaria Municipal do Meio Ambiente',
    });
  });

  it('answers 400 for a whitespace-only issuing_agency', async () => {
    await createLicenseRequest({ issuing_agency: '   ' })
      .attach('document_file', PDF_HEADER, {
        filename: 'licenca.pdf',
        contentType: 'application/pdf',
      })
      .expect(400);
  });

  it('answers 400 when the legacy issuing_agency_id field is sent', async () => {
    await createLicenseRequest({
      issuing_agency_id: '00000000-0000-4000-8000-000000000000',
    })
      .attach('document_file', PDF_HEADER, {
        filename: 'licenca.pdf',
        contentType: 'application/pdf',
      })
      .expect(400);
  });
  it('answers 400 when expiration_date is not after issue_date', async () => {
    await createLicenseRequest({
      issue_date: '2025-01-10T00:00:00.000Z',
      expiration_date: '2020-01-10T00:00:00.000Z',
    })
      .attach('document_file', PDF_HEADER, {
        filename: 'licenca.pdf',
        contentType: 'application/pdf',
      })
      .expect(400);
  });

  describe('POST /licenses/:licenseId/conditions', () => {
    let conditionLicenseId: string;

    function dueDateInDays(days: number): string {
      return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    }

    function conditionBody(overrides: Record<string, unknown> = {}) {
      return {
        name: 'MTR - Manifesto de Transporte de Resíduos',
        environmental_descriptor: 'Resíduos sólidos',
        license_id: conditionLicenseId,
        responsible_agency: 'FEPAM',
        due_date: dueDateInDays(400),
        status: 'Regular',
        has_delivery: true,
        description: 'Manifesto para destinação final de resíduos.',
        ...overrides,
      };
    }

    function postCondition(body: Record<string, unknown>) {
      return request(app.getHttpServer())
        .post(`/api/licenses/${conditionLicenseId}/conditions`)
        .set('Authorization', `Bearer ${token}`)
        .send(body);
    }

    beforeAll(async () => {
      const response = await createLicenseRequest({
        process_number: `LO condição-${uniqueSuffix()}`,
      })
        .attach('document_file', PDF_HEADER, {
          filename: 'licenca.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);

      conditionLicenseId = (response.body as { id: string }).id;
    });

    it('persists a condition with a free-text environmental descriptor', async () => {
      const response = await postCondition(conditionBody()).expect(201);

      expect(response.body).toMatchObject({
        environmental_descriptor: 'Resíduos sólidos',
        has_delivery: true,
        is_violated: false,
      });

      const stored = await prisma.licenseCondition.findUniqueOrThrow({
        where: { id: (response.body as { id: string }).id },
      });
      expect(stored.licenseId).toBe(conditionLicenseId);
      expect(stored.environmentalDescriptor).toBe('Resíduos sólidos');
      expect(stored.hasDelivery).toBe(true);
      expect(stored.isViolated).toBe(false);
      expect(stored.name).toBe('MTR - Manifesto de Transporte de Resíduos');
      expect(stored.status).toBe('REGULAR');
    });

    it('lists the condition with its environmental descriptor and violation flag', async () => {
      const created = await postCondition(
        conditionBody({ name: `Listagem ${uniqueSuffix()}` }),
      ).expect(201);
      const createdId = (created.body as { id: string }).id;

      const response = await request(app.getHttpServer())
        .get(`/api/customers/${customerId}/license-conditions`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const listed = (
        response.body as { data: Array<{ id: string; due_date: string }> }
      ).data.find((condition) => condition.id === createdId);
      expect(listed).toMatchObject({
        environmental_descriptor: 'Resíduos sólidos',
        has_delivery: true,
        is_violated: false,
      });
      expect(new Date(listed!.due_date).toISOString()).toBe(listed!.due_date);
    });

    it('ignores legacy item and ESG target fields instead of returning 500', async () => {
      const response = await postCondition(
        conditionBody({
          item_number: '99.7',
          target_metric_id: 'legacy-metric',
          target_operator: 'GREATER_THAN',
          target_value: 42,
        }),
      ).expect(201);

      expect(response.body).toMatchObject({
        environmental_descriptor: 'Resíduos sólidos',
      });
      expect(response.body).not.toHaveProperty('item_number');
      expect(response.body).not.toHaveProperty('target_metric_id');
    });

    it('updates the manual violation flag through the public condition route', async () => {
      const created = await postCondition(
        conditionBody({ name: `Violação manual ${uniqueSuffix()}` }),
      ).expect(201);
      const conditionId = (created.body as { id: string }).id;
      const dueDate = dueDateInDays(500);

      const response = await request(app.getHttpServer())
        .put(`/api/license-conditions/${conditionId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'MTR revisado',
          environmental_descriptor: 'Transporte de resíduos',
          has_delivery: false,
          due_date: dueDate,
          is_violated: true,
          description: 'Descrição revisada.',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        name: 'MTR revisado',
        environmental_descriptor: 'Transporte de resíduos',
        has_delivery: false,
        is_violated: true,
        description: 'Descrição revisada.',
      });
      await expect(
        prisma.licenseCondition.findUniqueOrThrow({
          where: { id: conditionId },
        }),
      ).resolves.toMatchObject({
        name: 'MTR revisado',
        environmentalDescriptor: 'Transporte de resíduos',
        hasDelivery: false,
        isViolated: true,
      });
    });

    it("does not expose another owner's condition through the public update route", async () => {
      const created = await postCondition(
        conditionBody({ name: `Isolamento ${uniqueSuffix()}` }),
      ).expect(201);
      const otherToken = await createUserAndLogin();

      await request(app.getHttpServer())
        .put(`/api/license-conditions/${(created.body as { id: string }).id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ is_violated: true })
        .expect(404);
    });

    it('allows a GRI parameter to be unlinked after a condition uses the same text', async () => {
      const metric = await prisma.esgMetric.create({
        data: {
          name: `Resíduos ${uniqueSuffix()}`,
          unit: 't',
          pillar: EsgPillar.AMBIENTAL,
        },
      });
      await request(app.getHttpServer())
        .post(`/api/customers/${customerId}/esg-metrics`)
        .set('Authorization', `Bearer ${token}`)
        .send({ metric_ids: [metric.id] })
        .expect(204);
      const created = await postCondition(
        conditionBody({ environmental_descriptor: metric.name }),
      ).expect(201);

      await request(app.getHttpServer())
        .post(`/api/customers/${customerId}/esg-metrics`)
        .set('Authorization', `Bearer ${token}`)
        .send({ metric_ids: [] })
        .expect(204);

      await expect(
        prisma.licenseCondition.findUnique({
          where: { id: (created.body as { id: string }).id },
        }),
      ).resolves.not.toBeNull();
    });

    it.each([
      ['name', ''],
      ['due_date', undefined],
      ['environmental_descriptor', ''],
      ['environmental_descriptor', undefined],
    ])('rejects an invalid required %s', async (field, value) => {
      const body: Record<string, unknown> = conditionBody();
      body[field] = value;

      await postCondition(body).expect(400);
    });

    it('numbers environmental descriptors on read and closes gaps after delete and reassignment', async () => {
      const licenseResponse = await createLicenseRequest({
        process_number: `LO numeração-${uniqueSuffix()}`,
      })
        .attach('document_file', PDF_HEADER, {
          filename: 'licenca.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);
      const licenseId = (licenseResponse.body as { id: string }).id;

      async function createCondition(name: string, descriptor: string) {
        const response = await request(app.getHttpServer())
          .post(`/api/licenses/${licenseId}/conditions`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            ...conditionBody({ name, environmental_descriptor: descriptor }),
            license_id: licenseId,
          })
          .expect(201);
        return (response.body as { id: string }).id;
      }

      const firstWasteId = await createCondition('MTR mensal', 'Resíduos');
      const secondWasteId = await createCondition(
        'Inventário anual',
        'Resíduos',
      );
      const waterId = await createCondition('Laudo de efluentes', 'Água');

      async function getConditionRows() {
        const response = await request(app.getHttpServer())
          .get(`/api/customers/${customerId}/licenses/${licenseId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        return (response.body as { conditions: Record<string, unknown>[] })
          .conditions;
      }

      await expect(getConditionRows()).resolves.toMatchObject([
        {
          item_number: '1',
          is_environmental_descriptor: true,
          environmental_descriptor: 'Resíduos',
        },
        { item_number: '1.1', id: firstWasteId, name: 'MTR mensal' },
        { item_number: '1.2', id: secondWasteId, name: 'Inventário anual' },
        {
          item_number: '2',
          is_environmental_descriptor: true,
          environmental_descriptor: 'Água',
        },
        { item_number: '2.1', id: waterId, name: 'Laudo de efluentes' },
      ]);

      await request(app.getHttpServer())
        .delete(
          `/api/customers/${customerId}/licenses/${licenseId}/conditions/${firstWasteId}`,
        )
        .set('Authorization', `Bearer ${token}`)
        .expect(204);
      await expect(getConditionRows()).resolves.toMatchObject([
        { item_number: '1', environmental_descriptor: 'Resíduos' },
        { item_number: '1.1', id: secondWasteId },
        { item_number: '2', environmental_descriptor: 'Água' },
        { item_number: '2.1', id: waterId },
      ]);

      await request(app.getHttpServer())
        .put(`/api/license-conditions/${waterId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ environmental_descriptor: 'Resíduos' })
        .expect(200);
      await expect(getConditionRows()).resolves.toMatchObject([
        { item_number: '1', environmental_descriptor: 'Resíduos' },
        { item_number: '1.1', id: secondWasteId },
        { item_number: '1.2', id: waterId },
      ]);
    });
  });

  describe('GET /customers/:customerId/licenses (panel)', () => {
    let panelCustomerId: string;
    let panelToken: string;
    let sectorId: string;

    beforeAll(async () => {
      panelToken = await createUserAndLogin();

      const sector = await prisma.sector.create({
        data: { name: `Setor Painel ${uniqueSuffix()}` },
      });
      sectorId = sector.id;
      const customerResponse = await request(app.getHttpServer())
        .post('/api/customers')
        .set('Authorization', `Bearer ${panelToken}`)
        .send({
          name: 'Empresa Painel de Licenças',
          // Safe to reuse: uniqueness is scoped to (ownerUserId, document),
          // and panelToken above is always a freshly created user.
          document: VALID_CNPJ,
          document_type: DocumentType.CNPJ,
          sector_id: sector.id,
          owner_name: 'Responsável Painel',
          owner_email: 'responsavel-painel@empresa.com.br',
          address: {
            type: AddressType.BILLING,
            city: 'Porto Alegre',
            state: 'RS',
            country_code: 'BR',
          },
        })
        .expect(201);
      panelCustomerId = (customerResponse.body as { id: string }).id;

      async function createPanelLicense(
        expirationDate: string,
        processNumber: string,
      ) {
        let req = request(app.getHttpServer())
          .post(`/api/customers/${panelCustomerId}/licenses`)
          .set('Authorization', `Bearer ${panelToken}`);
        const fields = {
          type: 'LO',
          process_number: processNumber,
          issuing_agency: 'FEPAM',
          issue_date: '2015-01-10T00:00:00.000Z',
          expiration_date: expirationDate,
        };
        for (const [key, value] of Object.entries(fields)) {
          req = req.field(key, value);
        }
        await req
          .attach('document_file', PDF_HEADER, {
            filename: 'licenca.pdf',
            contentType: 'application/pdf',
          })
          .expect(201);
      }

      // 1 regular, 1 attention, 2 expired.
      await createPanelLicense(
        new Date(Date.now() + 400 * 24 * 60 * 60 * 1000).toISOString(),
        `LO nº regular-${uniqueSuffix()}`,
      );
      await createPanelLicense(
        new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        `LO nº atencao-${uniqueSuffix()}`,
      );
      await createPanelLicense(
        '2020-01-01T00:00:00.000Z',
        `LO nº vencida-1-${uniqueSuffix()}`,
      );
      await createPanelLicense(
        '2019-01-01T00:00:00.000Z',
        `LO nº vencida-2-${uniqueSuffix()}`,
      );
    });

    it('returns a summary whose total equals the sum of regular, attention and expired', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/customers/${panelCustomerId}/licenses`)
        .set('Authorization', `Bearer ${panelToken}`)
        .expect(200);

      const body = response.body as {
        summary: {
          total: number;
          regular: number;
          attention: number;
          expired: number;
        };
        licenses: unknown[];
      };

      expect(body.summary).toEqual({
        total: 4,
        regular: 1,
        attention: 1,
        expired: 2,
      });
      expect(
        body.summary.regular + body.summary.attention + body.summary.expired,
      ).toBe(body.summary.total);
      expect(body.licenses).toHaveLength(4);
    });

    it('lists each company with its own total_licenses and updated_at', async () => {
      // Same owner, no licenses: proves the count is per company, not per owner.
      const emptyResponse = await request(app.getHttpServer())
        .post('/api/customers')
        .set('Authorization', `Bearer ${panelToken}`)
        .send({
          name: 'Empresa sem Licenças',
          document: '23456789000195',
          document_type: DocumentType.CNPJ,
          sector_id: sectorId,
          owner_name: 'Responsável Vazio',
          owner_email: 'responsavel-vazio@empresa.com.br',
          address: {
            type: AddressType.BILLING,
            city: 'Canoas',
            state: 'RS',
            country_code: 'BR',
          },
        })
        .expect(201);
      const emptyCustomerId = (emptyResponse.body as { id: string }).id;

      const response = await request(app.getHttpServer())
        .get('/api/customers')
        .set('Authorization', `Bearer ${panelToken}`)
        .expect(200);

      const body = response.body as {
        id: string;
        total_licenses: number;
        updated_at: string;
      }[];
      const byId = new Map(body.map((customer) => [customer.id, customer]));

      const stored = await prisma.license.count({
        where: { customerId: panelCustomerId },
      });
      expect(byId.get(panelCustomerId)?.total_licenses).toBe(stored);
      expect(byId.get(panelCustomerId)?.total_licenses).toBe(4);
      expect(byId.get(emptyCustomerId)?.total_licenses).toBe(0);

      const customer = await prisma.customer.findUniqueOrThrow({
        where: { id: panelCustomerId },
      });
      expect(byId.get(panelCustomerId)?.updated_at).toBe(
        customer.updatedAt.toISOString(),
      );
    });

    it("never returns another owner's licenses in the panel (data isolation)", async () => {
      const otherToken = await createUserAndLogin();

      const response = await request(app.getHttpServer())
        .get(`/api/customers/${panelCustomerId}/licenses`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);

      expect(response.body).not.toHaveProperty('summary');
    });
  });

  describe('POST /licenses/:licenseId/renew (conditions and history)', () => {
    let previousLicenseId: string;
    let conditionIds: string[];

    function renew(
      licenseId: string,
      conditions: unknown,
      overrides: Record<string, string> = {},
    ) {
      const fields: Record<string, string> = {
        process_number: `LO renovada-${uniqueSuffix()}`,
        issue_date: '2026-01-10T00:00:00.000Z',
        expiration_date: '2099-01-10T00:00:00.000Z',
        ...overrides,
      };
      if (conditions !== undefined) {
        fields.conditions =
          typeof conditions === 'string'
            ? conditions
            : JSON.stringify(conditions);
      }

      let req = request(app.getHttpServer())
        .post(`/api/licenses/${licenseId}/renew`)
        .set('Authorization', `Bearer ${token}`);
      for (const [key, value] of Object.entries(fields)) {
        req = req.field(key, value);
      }

      return req.attach('document_file', PDF_HEADER, {
        filename: 'renovada.pdf',
        contentType: 'application/pdf',
      });
    }

    beforeEach(async () => {
      const license = await createLicenseRequest({
        process_number: `LO a renovar-${uniqueSuffix()}`,
      })
        .attach('document_file', PDF_HEADER, {
          filename: 'licenca.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);
      previousLicenseId = (license.body as { id: string }).id;

      conditionIds = [];
      for (const name of ['Condição A', 'Condição B', 'Condição C']) {
        const condition = await request(app.getHttpServer())
          .post(`/api/licenses/${previousLicenseId}/conditions`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: `${name} ${uniqueSuffix()}`,
            environmental_descriptor: 'Resíduos sólidos',
            license_id: previousLicenseId,
            due_date: new Date(Date.now() + 400 * 86_400_000).toISOString(),
            responsible_agency: 'FEPAM',
            status: 'Regular',
            has_delivery: true,
            description: 'Condicionante de teste.',
          })
          .expect(201);
        conditionIds.push((condition.body as { id: string }).id);
      }
    });

    it('records fulfillment and copies exactly the marked conditions with their new due dates', async () => {
      const response = await renew(previousLicenseId, [
        {
          condition_id: conditionIds[0],
          fulfilled: true,
          copy_to_new: true,
          new_due_date: '2027-10-01',
        },
        {
          condition_id: conditionIds[1],
          fulfilled: false,
          copy_to_new: true,
          new_due_date: '2027-11-01',
        },
        { condition_id: conditionIds[2], fulfilled: true, copy_to_new: false },
      ]).expect(201);
      const renewedId = (response.body as { id: string }).id;

      const copies = await prisma.licenseCondition.findMany({
        where: { licenseId: renewedId },
        orderBy: { dueDate: 'asc' },
      });
      expect(copies).toHaveLength(2);
      expect(copies.map((c) => c.dueDate.toISOString().slice(0, 10))).toEqual([
        '2027-10-01',
        '2027-11-01',
      ]);
      expect(copies.every((c) => c.conditionStatus === 'IN_PROGRESS')).toBe(
        true,
      );

      const previous = await prisma.licenseCondition.findMany({
        where: { licenseId: previousLicenseId },
      });
      const byId = new Map(previous.map((c) => [c.id, c]));
      expect(byId.get(conditionIds[0])?.conditionStatus).toBe('FULFILLED');
      expect(byId.get(conditionIds[0])?.completionDate).not.toBeNull();
      expect(byId.get(conditionIds[1])?.conditionStatus).toBe('IN_PROGRESS');
      expect(byId.get(conditionIds[2])?.conditionStatus).toBe('FULFILLED');
    });

    it('does not conclude when some condition is left unmarked, leaving everything untouched', async () => {
      await renew(previousLicenseId, [
        { condition_id: conditionIds[0], fulfilled: true },
      ]).expect(400);
      await renew(previousLicenseId, undefined).expect(400);
      await renew(previousLicenseId, 'not json').expect(400);

      const stored = await prisma.license.findUniqueOrThrow({
        where: { id: previousLicenseId },
      });
      expect(stored.status).not.toBe('ARCHIVED');
      expect(await prisma.license.count({ where: { previousLicenseId } })).toBe(
        0,
      );
    });

    it('requires a new due date for copied conditions and rejects foreign condition ids', async () => {
      await renew(
        previousLicenseId,
        conditionIds.map((id) => ({
          condition_id: id,
          fulfilled: true,
          copy_to_new: true,
        })),
      ).expect(400);

      await renew(previousLicenseId, [
        ...conditionIds.map((id) => ({ condition_id: id, fulfilled: true })),
        { condition_id: randomUUID(), fulfilled: true },
      ]).expect(400);
    });

    it('lists the version chain newest first and 404s for an unknown license', async () => {
      const first = await renew(
        previousLicenseId,
        conditionIds.map((id) => ({ condition_id: id, fulfilled: true })),
      ).expect(201);
      const firstRenewalId = (first.body as { id: string }).id;
      const secondRenewal = await renew(firstRenewalId, []).expect(201);
      const secondRenewalId = (secondRenewal.body as { id: string }).id;

      const history = await request(app.getHttpServer())
        .get(`/api/licenses/${secondRenewalId}/history`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(
        (history.body as { id: string; is_current: boolean }[]).map((item) => [
          item.id,
          item.is_current,
        ]),
      ).toEqual([
        [secondRenewalId, true],
        [firstRenewalId, false],
        [previousLicenseId, false],
      ]);
      expect(history.body).toEqual([
        expect.objectContaining({ status: 'Regular' }),
        expect.objectContaining({ status: 'Renovada/Arquivada' }),
        expect.objectContaining({ status: 'Renovada/Arquivada' }),
      ]);

      await request(app.getHttpServer())
        .get(`/api/licenses/${randomUUID()}/history`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('PATCH /:licenseId/conditions/fulfillment', () => {
    let fulfillmentLicenseId: string;
    let otherLicenseId: string | undefined;
    let conditionAId: string;
    let conditionBId: string;
    let conditionCId: string;

    beforeAll(async () => {
      // Create a license and three conditions to test fulfillment
      const licenseResponse = await createLicenseRequest()
        .attach('document_file', PDF_HEADER, {
          filename: 'lic-fulfillment.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);
      fulfillmentLicenseId = (licenseResponse.body as { id: string }).id;

      const created = await prisma.$transaction([
        prisma.licenseCondition.create({
          data: {
            licenseId: fulfillmentLicenseId,
            name: 'Condicionante A',
            environmentalDescriptor: 'Recursos Hídricos',
            responsibleAgency: 'FEPAM',
            dueDate: new Date('2030-01-01'),
          },
        }),
        prisma.licenseCondition.create({
          data: {
            licenseId: fulfillmentLicenseId,
            name: 'Condicionante B',
            environmentalDescriptor: 'Recursos Hídricos',
            responsibleAgency: 'FEPAM',
            dueDate: new Date('2030-06-01'),
          },
        }),
        prisma.licenseCondition.create({
          data: {
            licenseId: fulfillmentLicenseId,
            name: 'Condicionante C',
            environmentalDescriptor: 'Recursos Hídricos',
            responsibleAgency: 'IBAMA',
            dueDate: new Date('2031-01-01'),
          },
        }),
      ]);

      conditionAId = created[0].id;
      conditionBId = created[1].id;
      conditionCId = created[2].id;
    });

    it('saves FULFILLED and IN_PROGRESS correctly for a mixed list', async () => {
      await request(app.getHttpServer())
        .patch(
          `/api/customers/${customerId}/licenses/${fulfillmentLicenseId}/conditions/fulfillment`,
        )
        .set('Authorization', `Bearer ${token}`)
        .send({
          items: [
            { condition_id: conditionAId, fulfilled: true },
            { condition_id: conditionBId, fulfilled: false },
            { condition_id: conditionCId, fulfilled: true },
          ],
        })
        .expect(204);

      const [condA, condB, condC] = await Promise.all([
        prisma.licenseCondition.findUniqueOrThrow({
          where: { id: conditionAId },
        }),
        prisma.licenseCondition.findUniqueOrThrow({
          where: { id: conditionBId },
        }),
        prisma.licenseCondition.findUniqueOrThrow({
          where: { id: conditionCId },
        }),
      ]);

      expect(condA.conditionStatus).toBe('FULFILLED');
      expect(condA.completionDate).not.toBeNull();

      expect(condB.conditionStatus).toBe('IN_PROGRESS');
      expect(condB.completionDate).toBeNull();

      expect(condC.conditionStatus).toBe('FULFILLED');
      expect(condC.completionDate).not.toBeNull();
    });

    it('returns 400 when a condition_id belongs to a different license', async () => {
      // Create a second license and grab one of its conditions
      const otherLicense = await createLicenseRequest({
        process_number: `LO nº 999/2024-${uniqueSuffix()}`,
      })
        .attach('document_file', PDF_HEADER, {
          filename: 'other.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);

      otherLicenseId = (otherLicense.body as { id: string }).id;

      const foreignCondition = await prisma.licenseCondition.create({
        data: {
          licenseId: otherLicenseId,
          name: 'Condicionante Alheia',
          environmentalDescriptor: 'Recursos Hídricos',
          responsibleAgency: 'FEPAM',
          dueDate: new Date('2030-01-01'),
        },
      });

      await request(app.getHttpServer())
        .patch(
          `/api/customers/${customerId}/licenses/${fulfillmentLicenseId}/conditions/fulfillment`,
        )
        .set('Authorization', `Bearer ${token}`)
        .send({
          items: [{ condition_id: foreignCondition.id, fulfilled: true }],
        })
        .expect(400);
    });

    it('returns 400 when items array is empty', async () => {
      await request(app.getHttpServer())
        .patch(
          `/api/customers/${customerId}/licenses/${fulfillmentLicenseId}/conditions/fulfillment`,
        )
        .set('Authorization', `Bearer ${token}`)
        .send({ items: [] })
        .expect(400);
    });

    it('returns 404 when the license belongs to another customer', async () => {
      const otherToken = await getOtherOwnerToken();

      await request(app.getHttpServer())
        .patch(
          `/api/customers/${customerId}/licenses/${fulfillmentLicenseId}/conditions/fulfillment`,
        )
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          items: [{ condition_id: conditionAId, fulfilled: true }],
        })
        .expect(404);
    });

    afterAll(async () => {
      const licenseIds = [fulfillmentLicenseId, otherLicenseId].filter(
        (id): id is string => Boolean(id),
      );
      if (licenseIds.length > 0) {
        await prisma.licenseCondition.deleteMany({
          where: { licenseId: { in: licenseIds } },
        });
        await prisma.license.deleteMany({
          where: { id: { in: licenseIds } },
        });
      }
    });
  });
});
