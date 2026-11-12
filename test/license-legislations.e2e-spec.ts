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
 * /licenses/:licenseId/legislations over real HTTP: the radar is listed
 * by legislation year (most recent first), an empty radar is an empty list
 * and another owner's license is a 404. Manual entries reuse catalog acts,
 * reject duplicates with 409 and removing one only drops the link.
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

  describe('manual radar entries', () => {
    const base = (licenseId: string) =>
      `/api/licenses/${licenseId}/legislations`;

    type RadarItem = {
      id: string;
      source: string;
      cited_excerpt: string | null;
      legislation: { id: string; number: string; summary: string | null };
    };

    function actData(number: string) {
      return {
        type: 'LEI',
        number,
        year: 2010,
        issuing_body: 'Governo Federal',
        summary: 'Institui a PNRS.',
      };
    }

    async function add(
      licenseId: string,
      body: Record<string, unknown>,
      expected = 201,
    ): Promise<RadarItem> {
      const response = await request(app.getHttpServer())
        .post(base(licenseId))
        .set('Authorization', `Bearer ${token}`)
        .send(body)
        .expect(expected);
      const item = response.body as RadarItem;
      if (item.legislation) legislationIds.push(item.legislation.id);

      return item;
    }

    it('adds a new act as a manual entry and reuses it on another license', async () => {
      const first = await createLicense();
      const second = await createLicense();
      const number = uniqueSuffix();

      const created = await add(first, {
        legislation: actData(number),
        cited_excerpt: null,
      });
      expect(created).toEqual(
        expect.objectContaining({
          source: 'MANUAL',
          cited_excerpt: null,
          impact: null,
          legislation: expect.objectContaining({
            number,
            year: 2010,
            issuing_body: 'Governo Federal',
          }) as unknown,
        }),
      );

      const reused = await add(second, {
        legislation: actData(number),
        cited_excerpt: '…art. 3º…',
      });
      expect(reused.legislation.id).toBe(created.legislation.id);
      await expect(
        prisma.legislation.count({ where: { number } }),
      ).resolves.toBe(1);

      const viaCatalog = await add(await createLicense(), {
        legislation_id: created.legislation.id,
      });
      expect(viaCatalog.legislation.id).toBe(created.legislation.id);
    });

    it('answers 409 when the act is already on the radar', async () => {
      const licenseId = await createLicense();
      const created = await add(licenseId, {
        legislation: actData(uniqueSuffix()),
      });

      await add(licenseId, { legislation_id: created.legislation.id }, 409);
    });

    it('validates the body', async () => {
      const licenseId = await createLicense();

      await add(licenseId, {}, 400);
      await add(licenseId, { legislation: { type: 'LEI', year: 2010 } }, 400);
      await add(
        licenseId,
        { legislation: { ...actData(uniqueSuffix()), issuing_body: ' ' } },
        400,
      );
      await add(licenseId, { legislation_id: randomUUID() }, 404);
    });

    it('edits the excerpt and the data of an act only this license cites', async () => {
      const licenseId = await createLicense();
      const created = await add(licenseId, {
        legislation: actData(uniqueSuffix()),
      });

      const response = await request(app.getHttpServer())
        .patch(`${base(licenseId)}/${created.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          cited_excerpt: 'art. 5º',
          legislation: {
            ...actData(created.legislation.number),
            summary: 'Nova ementa',
          },
        })
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: created.id,
          cited_excerpt: 'art. 5º',
          legislation: expect.objectContaining({
            id: created.legislation.id,
            summary: 'Nova ementa',
          }) as unknown,
        }),
      );
    });

    it('answers 409 when editing an act other licenses also cite', async () => {
      const number = uniqueSuffix();
      const licenseId = await createLicense();
      const created = await add(licenseId, { legislation: actData(number) });
      await add(await createLicense(), { legislation: actData(number) });

      await request(app.getHttpServer())
        .patch(`${base(licenseId)}/${created.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ legislation: { ...actData(number), summary: 'Outra' } })
        .expect(409);

      await request(app.getHttpServer())
        .patch(`${base(licenseId)}/${created.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ cited_excerpt: 'só o trecho' })
        .expect(200);
    });

    it('removes the entry without touching other licenses or the catalog', async () => {
      const number = uniqueSuffix();
      const licenseId = await createLicense();
      const otherLicenseId = await createLicense();
      const created = await add(licenseId, { legislation: actData(number) });
      await add(otherLicenseId, { legislation: actData(number) });

      await request(app.getHttpServer())
        .delete(`${base(licenseId)}/${created.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(base(licenseId))
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect([]);
      const other = await request(app.getHttpServer())
        .get(base(otherLicenseId))
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(other.body).toHaveLength(1);
      await expect(
        prisma.legislation.count({ where: { id: created.legislation.id } }),
      ).resolves.toBe(1);

      await request(app.getHttpServer())
        .delete(`${base(licenseId)}/${created.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it("answers 404 on another owner's license", async () => {
      const licenseId = await createLicense();
      const created = await add(licenseId, {
        legislation: actData(uniqueSuffix()),
      });

      await request(app.getHttpServer())
        .post(base(licenseId))
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ legislation_id: created.legislation.id })
        .expect(404);
      await request(app.getHttpServer())
        .patch(`${base(licenseId)}/${created.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ cited_excerpt: null })
        .expect(404);
      await request(app.getHttpServer())
        .delete(`${base(licenseId)}/${created.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });
  });
});
