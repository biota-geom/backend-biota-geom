import { randomUUID } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AddressType, ConditionStatus, DocumentType } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { FileStorage } from '../src/common/storage/file-storage';
import { StorageConfigService } from '../src/common/storage/storage-config.service';
import { PasswordHasher } from '../src/modules/auth/domain/password-hasher';
import { LicenseExtractionUnavailableError } from '../src/modules/licenses/domain/errors/license-extraction-unavailable.error';
import { UnreadableLicenseDocumentError } from '../src/modules/licenses/domain/errors/unreadable-license-document.error';
import {
  LicenseDocumentExtractor,
  LicenseExtraction,
} from '../src/modules/licenses/domain/license-extraction';
import { LICENSES_MESSAGES } from '../src/modules/licenses/presentation/messages/licenses.messages.pt-br';
import { PrismaService } from '../src/prisma/prisma.service';

/*
 * POST /api/licenses/extract over real HTTP, with the Bedrock adapter
 * replaced by a fake: the suite checks the HTTP contract, error mapping and
 * the "extraction never persists" rule without calling (or paying for) the
 * model. The Bedrock adapter itself is covered by its unit tests.
 *
 * The last test walks the whole user flow on the existing routes: extract,
 * review, then save the license and the selected conditions.
 */

const PASSWORD = 'Senha@1234';
const PDF = Buffer.from('%PDF-1.4\n%fake license content\n');

function uniqueSuffix(): string {
  return randomUUID().slice(0, 8);
}

const EXTRACTION: LicenseExtraction = {
  extractedData: {
    type: 'LO',
    processNumber: 'LO nº 118/2020',
    issuingAgency: 'FEPAM',
    issueDate: '2020-01-10',
    expirationDate: '2035-01-10',
  },
  suggestedConditions: [
    {
      environmentalDescriptor: 'Resíduos Sólidos',
      description: 'Apresentar relatório semestral de resíduos.',
      conditionType: 'PERIODIC',
      periodicity: 'SEMIANNUAL',
      dueDate: '2034-07-10',
    },
    {
      environmentalDescriptor: 'Empreendimento',
      description: 'Manter cópia da licença no local.',
      conditionType: 'INFORMATIVE',
      periodicity: null,
      dueDate: null,
    },
  ],
};

describe('License extraction (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let token: string;
  const extract = jest.fn<Promise<LicenseExtraction>, [Buffer]>();

  function postExtract() {
    return request(app.getHttpServer())
      .post('/api/licenses/extract')
      .set('Authorization', `Bearer ${token}`);
  }

  // Every file under the local storage dir, so a stray write is detectable.
  async function listStoredFiles(): Promise<string[]> {
    const root = app.get(StorageConfigService).localStorageDir;
    try {
      const entries = await readdir(root, { recursive: true });
      return entries.map((entry) => join(root, entry)).sort();
    } catch {
      return [];
    }
  }

  async function countRecords() {
    const [licenses, conditions] = await Promise.all([
      prisma.license.count(),
      prisma.licenseCondition.count(),
    ]);
    return { licenses, conditions };
  }

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(LicenseDocumentExtractor)
      .useValue({ extract })
      .compile();

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

    const email = `extract-${uniqueSuffix()}@biotageom.com.br`;
    await prisma.user.create({
      data: {
        name: 'Leitora de Licenças',
        email,
        passwordHash: await app.get(PasswordHasher).hash(PASSWORD),
      },
    });
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    token = (login.body as { access_token: string }).access_token;
  });

  beforeEach(() => {
    extract.mockReset();
    extract.mockResolvedValue(EXTRACTION);
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .post('/api/licenses/extract')
      .attach('document', PDF, {
        filename: 'licenca.pdf',
        contentType: 'application/pdf',
      })
      .expect(401);
    expect(extract).not.toHaveBeenCalled();
  });

  it('returns the suggestions in the snake_case contract without persisting anything', async () => {
    const before = await countRecords();
    const filesBefore = await listStoredFiles();
    const upload = jest.spyOn(app.get(FileStorage), 'upload');

    const response = await postExtract()
      .attach('document', PDF, {
        filename: 'licenca.pdf',
        contentType: 'application/pdf',
      })
      .expect(200);

    expect(response.body).toEqual({
      extracted_data: {
        type: 'LO',
        process_number: 'LO nº 118/2020',
        issuing_agency: 'FEPAM',
        issue_date: '2020-01-10',
        expiration_date: '2035-01-10',
      },
      suggested_conditions: [
        {
          environmental_descriptor: 'Resíduos Sólidos',
          description: 'Apresentar relatório semestral de resíduos.',
          condition_type: 'PERIODIC',
          periodicity: 'SEMIANNUAL',
          due_date: '2034-07-10',
        },
        {
          environmental_descriptor: 'Empreendimento',
          description: 'Manter cópia da licença no local.',
          condition_type: 'INFORMATIVE',
          periodicity: null,
          due_date: null,
        },
      ],
    });
    expect(extract).toHaveBeenCalledWith(PDF);
    // The PDF only lives in memory: no DB rows, no storage upload (local or
    // S3), no file written.
    await expect(countRecords()).resolves.toEqual(before);
    expect(upload).not.toHaveBeenCalled();
    await expect(listStoredFiles()).resolves.toEqual(filesBefore);
    upload.mockRestore();
  });

  it('rejects a request without the document field with 422', async () => {
    const response = await postExtract().expect(422);

    expect((response.body as { message: string }).message).toBe(
      LICENSES_MESSAGES.FILE_REQUIRED,
    );
    expect(extract).not.toHaveBeenCalled();
  });

  it('rejects a non-PDF upload with 422', async () => {
    const response = await postExtract()
      .attach('document', Buffer.from('fake image'), {
        filename: 'foto.jpg',
        contentType: 'image/jpeg',
      })
      .expect(422);

    expect((response.body as { message: string }).message).toBe(
      LICENSES_MESSAGES.INVALID_FILE_TYPE,
    );
    expect(extract).not.toHaveBeenCalled();
  });

  it('rejects a file labelled as PDF whose bytes are not a PDF with 422', async () => {
    const response = await postExtract()
      .attach('document', Buffer.from('not really a pdf'), {
        filename: 'licenca.pdf',
        contentType: 'application/pdf',
      })
      .expect(422);

    expect((response.body as { message: string }).message).toBe(
      LICENSES_MESSAGES.EXTRACTION_UNREADABLE,
    );
    expect(extract).not.toHaveBeenCalled();
  });

  it('answers 422 when the document cannot be read', async () => {
    extract.mockRejectedValue(new UnreadableLicenseDocumentError('test'));

    const response = await postExtract()
      .attach('document', PDF, {
        filename: 'licenca.pdf',
        contentType: 'application/pdf',
      })
      .expect(422);

    expect((response.body as { message: string }).message).toBe(
      LICENSES_MESSAGES.EXTRACTION_UNREADABLE,
    );
  });

  it('answers 503 with a generic message when the AI provider is unavailable', async () => {
    extract.mockRejectedValue(
      new LicenseExtractionUnavailableError('AccessDeniedException'),
    );

    const response = await postExtract()
      .attach('document', PDF, {
        filename: 'licenca.pdf',
        contentType: 'application/pdf',
      })
      .expect(503);

    expect((response.body as { message: string }).message).toBe(
      LICENSES_MESSAGES.EXTRACTION_UNAVAILABLE,
    );
    expect(JSON.stringify(response.body)).not.toContain(
      'AccessDeniedException',
    );
  });

  it('lets the reviewed suggestions be saved through the existing routes', async () => {
    const sector = await prisma.sector.create({
      data: { name: `Setor Extração ${uniqueSuffix()}` },
    });
    const agency = await prisma.issuingAgency.create({
      data: { name: `Órgão Extração ${uniqueSuffix()}`, acronym: 'FEPAM' },
    });
    const customer = await request(app.getHttpServer())
      .post('/api/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Empresa com Licença Lida por IA',
        document: '12345678000195',
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
    const customerId = (customer.body as { id: string }).id;

    // 1. Extract (nothing saved yet).
    const extraction = await postExtract()
      .attach('document', PDF, {
        filename: 'licenca.pdf',
        contentType: 'application/pdf',
      })
      .expect(200);
    const { extracted_data: data, suggested_conditions: suggestions } =
      extraction.body as {
        extracted_data: Record<string, string>;
        suggested_conditions: Array<Record<string, string | null>>;
      };

    // 2. The user picks the agency, reviews and saves the license.
    const license = await request(app.getHttpServer())
      .post(`/api/customers/${customerId}/licenses`)
      .set('Authorization', `Bearer ${token}`)
      .field('type', data.type)
      .field('process_number', data.process_number)
      .field('issuing_agency_id', agency.id)
      .field('issue_date', data.issue_date)
      .field('expiration_date', data.expiration_date)
      .attach('document_file', PDF, {
        filename: 'licenca.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    const licenseId = (license.body as { id: string }).id;

    // 3. Only the first suggestion is selected and completed by the user.
    const [selected] = suggestions;
    await request(app.getHttpServer())
      .post(`/api/customers/${customerId}/licenses/${licenseId}/conditions`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        conditions: [
          {
            environmental_descriptor: selected.environmental_descriptor,
            description: selected.description,
            condition_type: selected.condition_type,
            periodicity: selected.periodicity,
            deadline: `${selected.due_date}T00:00:00.000Z`,
            responsible_name: 'Equipe Ambiental',
            has_delivery: true,
          },
        ],
      })
      .expect(201);

    const stored = await prisma.licenseCondition.findMany({
      where: { licenseId },
    });
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      environmentalDescriptor: 'Resíduos Sólidos',
      description: 'Apresentar relatório semestral de resíduos.',
      periodicity: 'SEMIANNUAL',
      // Backend rule, not an AI suggestion.
      conditionStatus: ConditionStatus.IN_PROGRESS,
    });
  });
});
