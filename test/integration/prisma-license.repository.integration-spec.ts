import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import {
  DocumentType,
  LicenseConditionStatus,
  LicenseStatus,
  LicenseType,
} from '@prisma/client';
import { validateEnv } from '../../src/config/env.validation';
import { PrismaLicenseRepository } from '../../src/modules/licenses/infra/prisma-license.repository';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';

/*
 * Runs the panel listing query against a real Postgres: a mocked PrismaClient
 * would accept any `_count`/filtered-relation shape, so only a real database
 * proves the counts come out right.
 *
 * Every fixture is created under a fresh user and removed in afterAll, so the
 * suite never touches rows it did not create.
 */
describe('PrismaLicenseRepository (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let repository: PrismaLicenseRepository;
  let userId: string;
  let customerId: string;
  let issuingAgencyId: string;
  let licenseWithConditionsId: string;
  let licenseWithoutConditionsId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          validate: validateEnv,
          envFilePath: '.env',
        }),
        PrismaModule,
      ],
      providers: [PrismaLicenseRepository],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    repository = app.get(PrismaLicenseRepository);

    const suffix = randomUUID().slice(0, 8);
    const user = await prisma.user.create({
      data: {
        name: 'Integração Condicionantes',
        email: `conditions-${suffix}@biotageom.com.br`,
        passwordHash: 'not-a-real-hash',
      },
    });
    userId = user.id;

    const customer = await prisma.customer.create({
      data: {
        name: 'Empresa Condicionantes',
        document: '12345678000195',
        documentType: DocumentType.CNPJ,
        ownerName: 'Responsável',
        ownerEmail: 'responsavel@empresa.com.br',
        ownerUserId: userId,
      },
    });
    customerId = customer.id;

    const issuingAgency = await prisma.issuingAgency.create({
      data: { name: `Órgão Condicionantes ${suffix}` },
    });
    issuingAgencyId = issuingAgency.id;

    const licenseData = {
      customerId,
      issuingAgencyId,
      type: LicenseType.LO,
      issueDate: new Date('2020-01-10T00:00:00.000Z'),
      status: LicenseStatus.REGULAR,
      documentUrl: 'https://storage.example.com/license.pdf',
    };

    const licenseWithConditions = await prisma.license.create({
      data: {
        ...licenseData,
        processNumber: 'LO nº com-condicionantes',
        expirationDate: new Date('2098-01-10T00:00:00.000Z'),
      },
    });
    licenseWithConditionsId = licenseWithConditions.id;

    const licenseWithoutConditions = await prisma.license.create({
      data: {
        ...licenseData,
        processNumber: 'LO nº sem-condicionantes',
        expirationDate: new Date('2099-01-10T00:00:00.000Z'),
      },
    });
    licenseWithoutConditionsId = licenseWithoutConditions.id;

    // One condition per status that exists today — pending (REGULAR) and at
    // risk (ATTENTION/RISK). None of them means the obligation was met.
    await prisma.licenseCondition.createMany({
      data: [
        LicenseConditionStatus.REGULAR,
        LicenseConditionStatus.ATTENTION,
        LicenseConditionStatus.RISK,
      ].map((status, index) => ({
        licenseId: licenseWithConditionsId,
        name: `Condicionante ${index + 1}`,
        category: 'Monitoramento',
        dueDate: new Date('2097-01-10T00:00:00.000Z'),
        status,
      })),
    });
  });

  afterAll(async () => {
    // Licenses and their conditions cascade from the customer.
    await prisma.customer.deleteMany({ where: { id: customerId } });
    await prisma.issuingAgency.deleteMany({ where: { id: issuingAgencyId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await app.close();
  });

  it('counts every linked condition in total and none of the pending or at-risk ones as attended', async () => {
    const licenses = await repository.findAllByCustomerId(customerId);

    expect(
      licenses.map(({ id, conditionsSummary }) => ({ id, conditionsSummary })),
    ).toEqual([
      {
        id: licenseWithConditionsId,
        conditionsSummary: { total: 3, attended: 0 },
      },
      {
        id: licenseWithoutConditionsId,
        conditionsSummary: { total: 0, attended: 0 },
      },
    ]);
  });

  it('does not leak the raw relation fields used to build the counts', async () => {
    const [license] = await repository.findAllByCustomerId(customerId);

    expect(license).not.toHaveProperty('_count');
    expect(license).not.toHaveProperty('conditions');
    expect(license.issuingAgency?.id).toBe(issuingAgencyId);
  });
});
