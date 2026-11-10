import { randomUUID } from 'node:crypto';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import {
  DocumentType,
  LegislationImpact,
  LegislationType,
  LicenseLegislationSource,
  LicenseStatus,
} from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PasswordHasher } from '../src/modules/auth/domain/password-hasher';
import { PrismaService } from '../src/prisma/prisma.service';

/*
 * GET /licenses/:licenseId/legislations over real HTTP: the radar is listed
 * by legislation year (most recent first), an empty radar is an empty list
 * and another owner's license is a 404.
 *
 * Every unique value is suffixed per run, so the suite can run repeatedly
 * against the same database without wiping other suites' fixtures.
 */

const PASSWORD = 'Senha@1234';

function uniqueSuffix(): string {
  return randomUUID().slice(0, 8);
}

describe('License legislations (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let ownerId: string;
  let token: string;
  let otherToken: string;
  let customerId: string;
  const legislationIds: string[] = [];

  async function createUserAndLogin(): Promise<{ id: string; token: string }> {
    const email = `radar-${uniqueSuffix()}@biotageom.com.br`;
    const user = await prisma.user.create({
      data: {
        name: 'Consultoria do Radar',
        email,
        passwordHash: await app.get(PasswordHasher).hash(PASSWORD),
      },
    });

    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);

    return {
      id: user.id,
      token: (response.body as { access_token: string }).access_token,
    };
  }

  async function createLicense(): Promise<string> {
    const license = await prisma.license.create({
      data: {
        customerId,
        type: 'LO',
        processNumber: `LO nº ${uniqueSuffix()}`,
        issuingAgency: 'FEPAM',
        issueDate: new Date('2024-01-10T00:00:00.000Z'),
        expirationDate: new Date('2099-01-10T00:00:00.000Z'),
        status: LicenseStatus.REGULAR,
        documentUrl: 'https://example.com/license.pdf',
      },
    });

    return license.id;
  }

  async function createLegislation(
    type: LegislationType,
    year: number,
  ): Promise<string> {
    const legislation = await prisma.legislation.create({
      data: {
        type,
        number: uniqueSuffix(),
        year,
        issuingBody: 'Governo Federal',
        summary: `Ato de ${year}`,
      },
    });
    legislationIds.push(legislation.id);

    return legislation.id;
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
    await app.init();

    prisma = app.get(PrismaService);

    const owner = await createUserAndLogin();
    ownerId = owner.id;
    token = owner.token;
    otherToken = (await createUserAndLogin()).token;

    const customer = await prisma.customer.create({
      data: {
        name: 'Empresa do Radar',
        document: uniqueSuffix(),
        documentType: DocumentType.CNPJ,
        ownerName: 'Responsável Ambiental',
        ownerEmail: 'responsavel@empresa.com.br',
        ownerUserId: ownerId,
      },
    });
    customerId = customer.id;
  });

  afterAll(async () => {
    await prisma.customer.deleteMany({ where: { id: customerId } });
    await prisma.legislation.deleteMany({
      where: { id: { in: legislationIds } },
    });
    await app.close();
  });

  it('lists the radar from the most recent legislation to the oldest', async () => {
    const licenseId = await createLicense();
    const oldest = await createLegislation(LegislationType.LEI, 1998);
    const newest = await createLegislation(LegislationType.RESOLUCAO, 2023);
    const middle = await createLegislation(LegislationType.DECRETO, 2010);

    await prisma.licenseLegislation.createMany({
      data: [
        {
          licenseId,
          legislationId: oldest,
          source: LicenseLegislationSource.MANUAL,
        },
        {
          licenseId,
          legislationId: newest,
          source: LicenseLegislationSource.SCAN,
          citedExcerpt: '…conforme a Resolução…',
          impact: LegislationImpact.HIGH,
        },
        {
          licenseId,
          legislationId: middle,
          source: LicenseLegislationSource.SCAN,
        },
      ],
    });

    const response = await request(app.getHttpServer())
      .get(`/api/licenses/${licenseId}/legislations`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const body = response.body as {
      legislation: { id: string; year: number };
    }[];
    expect(body.map((item) => item.legislation.year)).toEqual([
      2023, 2010, 1998,
    ]);
    expect(body[0]).toEqual({
      id: expect.any(String) as unknown,
      legislation: {
        id: newest,
        type: 'RESOLUCAO',
        number: expect.any(String) as unknown,
        year: 2023,
        issuing_body: 'Governo Federal',
        summary: 'Ato de 2023',
      },
      source: 'SCAN',
      cited_excerpt: '…conforme a Resolução…',
      impact: 'HIGH',
      technical_analysis: null,
      read_at: null,
      created_at: expect.any(String) as unknown,
    });
  });

  it('answers an empty list for a license without legislations', async () => {
    const licenseId = await createLicense();

    await request(app.getHttpServer())
      .get(`/api/licenses/${licenseId}/legislations`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect([]);
  });

  it("answers 404 for another owner's license and for an unknown one", async () => {
    const licenseId = await createLicense();

    await request(app.getHttpServer())
      .get(`/api/licenses/${licenseId}/legislations`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/api/licenses/${randomUUID()}/legislations`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .get(`/api/licenses/${randomUUID()}/legislations`)
      .expect(401);
  });
});
