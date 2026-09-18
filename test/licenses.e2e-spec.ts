import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AddressType, DocumentType, LicenseType } from '@prisma/client';
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
      .post('/auth/login')
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
      .post(`/customers/${customerId}/licenses`)
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
      .post('/customers')
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
});
