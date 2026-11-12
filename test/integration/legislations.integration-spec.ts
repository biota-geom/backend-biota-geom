import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import {
  DocumentType,
  LegislationType,
  LicenseLegislationSource,
  LicenseStatus,
  Prisma,
} from '@prisma/client';
import { validateEnv } from '../../src/config/env.validation';
import { LegislationRepository } from '../../src/modules/legislations/domain/legislations.repository';
import { LicenseLegislationRepository } from '../../src/modules/legislations/domain/license-legislations.repository';
import { LegislationsModule } from '../../src/modules/legislations/legislations.module';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';

// Prova no Postgres real o que o schema do radar promete: identidade única da
// legislação, vínculo único por licença, Cascade ao apagar a licença e
// Restrict ao apagar uma legislação em uso.
//   npm run test:integration
describe('License legislation radar (integration)', () => {
  const run = Date.now().toString();
  let prisma: PrismaService;
  let legislations: LegislationRepository;
  let links: LicenseLegislationRepository;
  let closeModule: () => Promise<void>;
  let userId: string;
  let customerId: string;

  async function createLicense(processNumber: string) {
    return prisma.license.create({
      data: {
        customerId,
        type: 'LO',
        processNumber: `${run}-${processNumber}`,
        issuingAgency: 'FEAM',
        issueDate: new Date('2026-01-01'),
        expirationDate: new Date('2028-01-01'),
        status: LicenseStatus.REGULAR,
        documentUrl: 'http://localhost/doc.pdf',
      },
    });
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          validate: validateEnv,
          envFilePath: '.env',
        }),
        PrismaModule,
        LegislationsModule,
      ],
    }).compile();
    await moduleRef.init();

    prisma = moduleRef.get(PrismaService);
    legislations = moduleRef.get(LegislationRepository);
    links = moduleRef.get(LicenseLegislationRepository);
    closeModule = () => moduleRef.close();

    const user = await prisma.user.create({
      data: {
        email: `radar-${run}@biotageom.com.br`,
        passwordHash: 'x',
        name: 'Radar',
      },
    });
    userId = user.id;
    const customer = await prisma.customer.create({
      data: {
        name: `Radar ${run}`,
        document: run.padStart(14, '0'),
        documentType: DocumentType.CNPJ,
        ownerName: 'Owner',
        ownerEmail: 'owner@example.com',
        ownerUserId: userId,
      },
    });
    customerId = customer.id;
  });

  afterAll(async () => {
    await prisma.customer.deleteMany({ where: { id: customerId } });
    await prisma.legislation.deleteMany({
      where: { number: { startsWith: run } },
    });
    await prisma.user.deleteMany({ where: { id: userId } });
    await closeModule();
  });

  it('keeps one catalog row per (type, number, year)', async () => {
    const data = {
      type: LegislationType.PORTARIA,
      number: `${run}-A`,
      year: 2024,
      issuingBody: 'MMA',
      summary: 'Curated summary',
    };

    const first = await legislations.findOrCreate(data);
    const second = await legislations.findOrCreate({
      ...data,
      summary: 'Scan guess',
    });

    expect(second.id).toBe(first.id);
    expect(second.summary).toBe('Curated summary');
    await expect(
      legislations.findByIdentity({
        type: data.type,
        number: data.number,
        year: data.year,
        issuingBody: data.issuingBody,
      }),
    ).resolves.toMatchObject({ id: first.id });
    await expect(
      prisma.legislation.create({ data: { ...data, summary: null } }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('keeps same-numbered acts from different issuers apart', async () => {
    const act = {
      type: LegislationType.LEI,
      number: `${run}-M`,
      year: 2005,
    };

    const portoAlegre = await legislations.findOrCreate({
      ...act,
      issuingBody: 'Prefeitura de Porto Alegre',
    });
    const canoas = await legislations.findOrCreate({
      ...act,
      issuingBody: 'Prefeitura de Canoas',
    });

    expect(canoas.id).not.toBe(portoAlegre.id);
    expect(canoas.issuingBody).toBe('Prefeitura de Canoas');
  });

  it('links an act to a license once, with the contract defaults', async () => {
    const license = await createLicense('link');
    const legislation = await legislations.findOrCreate({
      type: LegislationType.LEI,
      number: `${run}-B`,
      year: 2010,
      issuingBody: 'Governo Federal',
    });

    const link = await links.create({
      licenseId: license.id,
      legislationId: legislation.id,
      source: LicenseLegislationSource.SCAN,
      citedExcerpt: '…conforme a Lei…',
    });

    expect(link).toMatchObject({
      impact: null,
      technicalAnalysis: null,
      readAt: null,
      legislation: { id: legislation.id },
    });
    await expect(
      links.create({
        licenseId: license.id,
        legislationId: legislation.id,
        source: LicenseLegislationSource.MANUAL,
      }),
    ).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    await expect(links.findAllByLicenseId(license.id)).resolves.toHaveLength(1);
    await expect(
      links.findByIdForLicense(link.id, 'a0000000-0000-7000-8000-000000000000'),
    ).resolves.toBeNull();
  });

  it('blocks deleting a legislation in use and cascades with the license', async () => {
    const license = await createLicense('cascade');
    const legislation = await legislations.findOrCreate({
      type: LegislationType.DECRETO,
      number: `${run}-C`,
      year: 2000,
      issuingBody: 'Governo Federal',
    });
    await links.create({
      licenseId: license.id,
      legislationId: legislation.id,
      source: LicenseLegislationSource.MANUAL,
    });

    await expect(
      prisma.legislation.delete({ where: { id: legislation.id } }),
    ).rejects.toMatchObject({ code: 'P2003' });

    await prisma.license.delete({ where: { id: license.id } });

    await expect(links.findAllByLicenseId(license.id)).resolves.toEqual([]);
    await expect(legislations.findById(legislation.id)).resolves.not.toBeNull();
  });
});
