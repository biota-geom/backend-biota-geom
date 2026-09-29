import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import {
  AddressType,
  DocumentType,
  EsgPillar,
  LicenseType,
} from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PasswordHasher } from '../src/modules/auth/domain/password-hasher';
import { LOCAL_STORAGE_URL_PREFIX } from '../src/modules/licenses/infra/storage/local-disk-license-document-storage';
import { StorageConfigService } from '../src/modules/licenses/infra/storage/storage-config.service';
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
  let issuingAgencyId: string;

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

  function createLicenseRequest(overrides: Record<string, string> = {}) {
    const fields = {
      type: LicenseType.LO,
      process_number: 'LO nº 118/2020',
      issuing_agency_id: issuingAgencyId,
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
      prefix: `/${LOCAL_STORAGE_URL_PREFIX}`,
    });
    await app.init();

    prisma = app.get(PrismaService);

    const sector = await prisma.sector.create({
      data: { name: `Setor Licenças ${uniqueSuffix()}` },
    });
    const issuingAgency = await prisma.issuingAgency.create({
      data: { name: `Órgão Licenças ${uniqueSuffix()}`, acronym: 'TEST' },
    });
    issuingAgencyId = issuingAgency.id;

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
    const otherToken = await createUserAndLogin();

    await createLicenseRequest()
      .set('Authorization', `Bearer ${otherToken}`)
      .attach('document_file', PDF_HEADER, {
        filename: 'licenca.pdf',
        contentType: 'application/pdf',
      })
      .expect(404);
  });

  it('answers 422 for an unknown issuing agency', async () => {
    await createLicenseRequest({
      issuing_agency_id: '00000000-0000-4000-8000-000000000000',
    })
      .attach('document_file', PDF_HEADER, {
        filename: 'licenca.pdf',
        contentType: 'application/pdf',
      })
      .expect(422);
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
    let linkedMetric: { id: string; name: string };
    let unlinkedMetricId: string;
    let foreignPrivateMetricId: string;

    function dueDateInDays(days: number): string {
      return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    }

    function conditionBody(overrides: Record<string, unknown> = {}) {
      return {
        name: 'MTR - Manifesto de Transporte de Resíduos',
        esg_metric_id: linkedMetric.id,
        license_id: conditionLicenseId,
        responsible_agency: 'FEPAM',
        due_date: dueDateInDays(400),
        status: 'Regular',
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

      const [linked, unlinked] = await Promise.all(
        ['Resíduos', 'Emissões'].map((name) =>
          prisma.esgMetric.create({
            data: {
              name: `${name} ${uniqueSuffix()}`,
              unit: 't',
              pillar: EsgPillar.AMBIENTAL,
            },
          }),
        ),
      );
      linkedMetric = { id: linked.id, name: linked.name };
      unlinkedMetricId = unlinked.id;

      const otherOwner = await prisma.user.create({
        data: {
          name: 'Outra Consultoria',
          email: `other-${uniqueSuffix()}@biotageom.com.br`,
          passwordHash: 'not-a-real-hash',
        },
      });
      const foreignPrivate = await prisma.esgMetric.create({
        data: {
          name: `Parâmetro privado ${uniqueSuffix()}`,
          unit: 'un',
          pillar: EsgPillar.AMBIENTAL,
          customerId: otherOwner.id,
        },
      });
      foreignPrivateMetricId = foreignPrivate.id;

      await request(app.getHttpServer())
        .post(`/api/customers/${customerId}/esg-metrics`)
        .set('Authorization', `Bearer ${token}`)
        .send({ metric_ids: [linkedMetric.id] })
        .expect(204);
    });

    it('persists a condition categorized by a GRI parameter linked to the customer', async () => {
      const response = await postCondition(conditionBody()).expect(201);

      expect(response.body).toMatchObject({
        category: { id: linkedMetric.id, name: linkedMetric.name },
      });

      const stored = await prisma.licenseCondition.findUniqueOrThrow({
        where: { id: (response.body as { id: string }).id },
      });
      expect(stored.licenseId).toBe(conditionLicenseId);
      expect(stored.esgMetricId).toBe(linkedMetric.id);
      expect(stored.name).toBe('MTR - Manifesto de Transporte de Resíduos');
      expect(stored.status).toBe('REGULAR');
    });

    it('lists the condition with the GRI parameter name as its category', async () => {
      const created = await postCondition(
        conditionBody({ name: `Listagem ${uniqueSuffix()}` }),
      ).expect(201);
      const createdId = (created.body as { id: string }).id;

      const response = await request(app.getHttpServer())
        .get(`/api/customers/${customerId}/license-conditions`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const listed = (
        response.body as Array<{ id: string; due_date: string }>
      ).find((condition) => condition.id === createdId);
      expect(listed).toMatchObject({
        category: { id: linkedMetric.id, name: linkedMetric.name },
      });
      expect(new Date(listed!.due_date).toISOString()).toBe(listed!.due_date);
    });

    it('answers 422 for a catalog GRI parameter not linked to the customer', async () => {
      const response = await postCondition(
        conditionBody({ esg_metric_id: unlinkedMetricId }),
      ).expect(422);

      expect(response.body).toEqual({
        statusCode: 422,
        message: 'O parâmetro GRI informado não está vinculado a esta empresa.',
        error: 'Unprocessable Entity',
      });
    });

    it('refuses with 409 to unlink a GRI parameter still used by a condition', async () => {
      function linkMetrics(metricIds: string[]) {
        return request(app.getHttpServer())
          .post(`/api/customers/${customerId}/esg-metrics`)
          .set('Authorization', `Bearer ${token}`)
          .send({ metric_ids: metricIds });
      }

      const response = await linkMetrics([]).expect(409);
      expect((response.body as { message: string }).message).toBe(
        'Não é possível desvincular parâmetros GRI usados como categoria de condicionantes desta empresa.',
      );
      await expect(
        prisma.customerEsgMetric.count({
          where: { customerId, esgMetricId: linkedMetric.id },
        }),
      ).resolves.toBe(1);

      // Keeping the parameter in use while changing the others is allowed.
      await linkMetrics([linkedMetric.id, unlinkedMetricId]).expect(204);
      await linkMetrics([linkedMetric.id]).expect(204);
    });

    it("hides another account's private GRI parameter behind the same 404 as an unknown one", async () => {
      // Even a (stray) link to the customer must not make it usable.
      await prisma.customerEsgMetric.create({
        data: { customerId, esgMetricId: foreignPrivateMetricId },
      });

      const foreign = await postCondition(
        conditionBody({ esg_metric_id: foreignPrivateMetricId }),
      ).expect(404);
      const unknown = await postCondition(
        conditionBody({
          esg_metric_id: '00000000-0000-4000-8000-000000000000',
        }),
      ).expect(404);

      expect(foreign.body).toEqual(unknown.body);
    });

    it('refuses to delete a GRI parameter in use by a condition', async () => {
      const metric = await prisma.esgMetric.create({
        data: {
          name: `Em uso ${uniqueSuffix()}`,
          unit: 't',
          pillar: EsgPillar.AMBIENTAL,
        },
      });
      await prisma.customerEsgMetric.create({
        data: { customerId, esgMetricId: metric.id },
      });
      await postCondition(conditionBody({ esg_metric_id: metric.id })).expect(
        201,
      );
      // Drop the customer link so only the condition still references it.
      await prisma.customerEsgMetric.delete({
        where: {
          customerId_esgMetricId: { customerId, esgMetricId: metric.id },
        },
      });

      await expect(
        prisma.esgMetric.delete({ where: { id: metric.id } }),
      ).rejects.toMatchObject({ code: 'P2003' });
      await expect(
        prisma.esgMetric.findUnique({ where: { id: metric.id } }),
      ).resolves.not.toBeNull();
    });

    it('rejects the former free-text category field', async () => {
      await postCondition(conditionBody({ category: 'Resíduos' })).expect(400);
    });

    it.each([
      ['name', ''],
      ['due_date', undefined],
      ['esg_metric_id', 'not-a-uuid'],
      ['esg_metric_id', undefined],
    ])('rejects an invalid required %s', async (field, value) => {
      const body: Record<string, unknown> = conditionBody();
      body[field] = value;

      await postCondition(body).expect(400);
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
          type: LicenseType.LO,
          process_number: processNumber,
          issuing_agency_id: issuingAgencyId,
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
});
