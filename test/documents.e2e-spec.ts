import {
  INestApplication,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentType } from '@prisma/client';
import { CustomerDocumentType } from '../src/modules/documents/domain/customer-document-type';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PasswordHasher } from '../src/modules/auth/domain/password-hasher';
import { AUTH_MESSAGES } from '../src/modules/auth/presentation/messages/auth.messages.pt-br';
import { MAX_DOCUMENT_SIZE_BYTES } from '../src/modules/documents/presentation/documents.controller';
import { PrismaService } from '../src/prisma/prisma.service';

const PASSWORD = 'Senha@1234';
const PDF = Buffer.from('%PDF-1.7 document content');

describe('Customer documents (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let ownerId: string;
  let customerId: string;
  let ownerToken: string;
  let otherToken: string;

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

  function upload(
    token: string,
    targetCustomerId: string,
    date: string,
    title: string,
    file = PDF,
    filename = 'report.pdf',
    contentType = 'application/pdf',
  ) {
    return request(app.getHttpServer())
      .post(`/api/customers/${targetCustomerId}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .field('title', title)
      .field('type', CustomerDocumentType.LAUDO)
      .field('document_date', date)
      .attach('file', file, { filename, contentType });
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
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
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "document", "customer_esg_metrics", "licenses", "customers", "customer_address", "esg_metric", "sectors", "users" RESTART IDENTITY CASCADE',
    );

    const owner = await createUser(
      'documents.owner@biotageom.com.br',
      'Consultoria Documentos',
    );
    const other = await createUser(
      'documents.other@biotageom.com.br',
      'Outra Consultoria',
    );
    ownerId = owner.id;
    ownerToken = await login(owner.email);
    otherToken = await login(other.email);

    const sector = await prisma.sector.create({
      data: { name: 'Documents E2E Sector' },
    });
    const customer = await prisma.customer.create({
      data: {
        name: 'Documents E2E Company',
        document: '12345678000195',
        documentType: DocumentType.CNPJ,
        ownerName: 'Responsible Person',
        ownerEmail: 'responsible@example.com',
        ownerUserId: owner.id,
        sectorId: sector.id,
      },
    });
    customerId = customer.id;
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  it('uploads three files sequentially and lists them by document date descending', async () => {
    for (const [date, title] of [
      ['2026-01-10', 'Old report'],
      ['2026-09-10', 'Newest report'],
      ['2026-05-10', 'Middle report'],
    ]) {
      const response = await upload(ownerToken, customerId, date, title).expect(
        201,
      );

      expect(response.body).toMatchObject({
        title,
        type: 'LAUDO',
        document_date: date,
        file_name: 'report.pdf',
        size_bytes: PDF.length,
        uploaded_by: { id: ownerId, name: 'Consultoria Documentos' },
      });
      expect(response.body).not.toHaveProperty('file_url');
    }

    const response = await request(app.getHttpServer())
      .get(`/api/customers/${customerId}/documents`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(
      (response.body as Array<{ title: string }>).map(({ title }) => title),
    ).toEqual(['Newest report', 'Middle report', 'Old report']);
  });

  it('does not list documents with deleted_at set', async () => {
    const hidden = await prisma.document.create({
      data: {
        customerId,
        uploadedById: ownerId,
        title: 'Deleted report',
        type: CustomerDocumentType.LAUDO,
        documentDate: new Date('2026-10-01T00:00:00.000Z'),
        fileUrl: 'https://files.example/deleted.pdf',
        fileName: 'deleted.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 10,
        deletedAt: new Date(),
      },
    });

    const response = await request(app.getHttpServer())
      .get(`/api/customers/${customerId}/documents`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(
      (response.body as Array<{ id: string }>).map(({ id }) => id),
    ).not.toContain(hidden.id);
  });

  it('rejects an executable and a file over 20 MB with friendly messages', async () => {
    const executable = await upload(
      ownerToken,
      customerId,
      '2026-08-15',
      'Executable',
      Buffer.from('MZ executable'),
      'malware.exe',
      'application/x-msdownload',
    ).expect(422);
    expect((executable.body as { message: string }).message).toBe(
      AUTH_MESSAGES.DOCUMENT_INVALID_FILE_TYPE,
    );

    const oversized = Buffer.alloc(MAX_DOCUMENT_SIZE_BYTES + 1);
    oversized.write('%PDF-');
    const tooLarge = await upload(
      ownerToken,
      customerId,
      '2026-08-15',
      'Large PDF',
      oversized,
    ).expect(422);
    expect((tooLarge.body as { message: string }).message).toBe(
      AUTH_MESSAGES.DOCUMENT_FILE_TOO_LARGE,
    );
  });

  it("returns the same 404 for another owner's customer and an unknown id", async () => {
    const foreign = await request(app.getHttpServer())
      .get(`/api/customers/${customerId}/documents`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
    const unknown = await request(app.getHttpServer())
      .get('/api/customers/00000000-0000-4000-8000-000000000000/documents')
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);

    expect(foreign.body).toEqual(unknown.body);
    expect((foreign.body as { message: string }).message).toBe(
      AUTH_MESSAGES.CUSTOMER_NOT_FOUND,
    );

    await upload(otherToken, customerId, '2026-08-15', 'Foreign upload').expect(
      404,
    );
  });
});
