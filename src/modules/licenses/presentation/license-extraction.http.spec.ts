import {
  CanActivate,
  ExecutionContext,
  INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { ExtractLicenseDataUseCase } from '../application/extract-license-data.use-case';
import { GetLicenseExtractionJobUseCase } from '../application/get-license-extraction-job.use-case';
import { StartLicenseExtractionUseCase } from '../application/start-license-extraction.use-case';
import { LicenseExtractionUnavailableError } from '../domain/errors/license-extraction-unavailable.error';
import { ExtractionJobStore } from '../domain/extraction-job';
import {
  LicenseDocumentExtractor,
  LicenseExtraction,
} from '../domain/license-extraction';
import { InMemoryExtractionJobStore } from '../infra/extraction/in-memory-extraction-job.store';
import { LicenseExtractionController } from './license-extraction.controller';
import { LICENSES_MESSAGES } from './messages/licenses.messages.pt-br';

/*
 * The extraction routes over real HTTP with the real controller, use cases and
 * in-memory store; only auth (user taken from a header) and the model are
 * faked, so it needs no database. Covers the async contract end to end.
 */

const PDF = Buffer.from('%PDF-1.4\nfake');
const EXTRACTION: LicenseExtraction = {
  extractedData: {
    type: 'LO',
    processNumber: 'LO nº 1/2020',
    issuingAgency: 'FEPAM',
    issueDate: '2020-01-10',
    expirationDate: '2030-01-10',
  },
  suggestedConditions: [],
};

class HeaderAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string>;
      user?: { id: string };
    }>();
    const id = req.headers['x-user'];
    if (!id) return false;
    req.user = { id };

    return true;
  }
}

describe('License extraction routes (HTTP, no database)', () => {
  let app: INestApplication<App>;
  const extract = jest.fn<Promise<LicenseExtraction>, [Buffer]>();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [LicenseExtractionController],
      providers: [
        ExtractLicenseDataUseCase,
        StartLicenseExtractionUseCase,
        GetLicenseExtractionJobUseCase,
        { provide: ExtractionJobStore, useClass: InMemoryExtractionJobStore },
        { provide: LicenseDocumentExtractor, useValue: { extract } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(HeaderAuthGuard)
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => extract.mockReset());
  afterAll(() => app.close());

  const upload = (user = 'user-a') =>
    request(app.getHttpServer())
      .post('/licenses/extract')
      .set('x-user', user)
      .attach('document', PDF, {
        filename: 'l.pdf',
        contentType: 'application/pdf',
      });
  const poll = (jobId: string, user = 'user-a') =>
    request(app.getHttpServer())
      .get(`/licenses/extract/${jobId}`)
      .set('x-user', user);
  const settled = async (jobId: string): Promise<{ status: string }> => {
    for (let i = 0; i < 50; i++) {
      const res = await poll(jobId).expect(200);
      const body = res.body as { status: string };
      if (body.status !== 'PENDING') return body;
      await new Promise((r) => setTimeout(r, 10));
    }
    throw new Error('never settled');
  };

  it('answers 202 immediately while the model is still running, then DONE', async () => {
    let finish!: (value: LicenseExtraction) => void;
    extract.mockReturnValue(new Promise((resolve) => (finish = resolve)));

    const started = await upload().expect(202);
    const { job_id: jobId } = started.body as { job_id: string };
    expect(jobId).toEqual(expect.any(String));

    expect((await poll(jobId).expect(200)).body).toEqual({
      status: 'PENDING',
      result: null,
      error: null,
    });

    finish(EXTRACTION);
    const done = (await settled(jobId)) as unknown as {
      status: string;
      result: { extracted_data: { type: string } };
      error: null;
    };
    expect(done.status).toBe('DONE');
    expect(done.result.extracted_data.type).toBe('LO');
    expect(done.error).toBeNull();
  });

  it('reports a provider failure as FAILED with a generic message', async () => {
    extract.mockRejectedValue(new LicenseExtractionUnavailableError('Denied'));

    const { job_id: jobId } = (await upload().expect(202)).body as {
      job_id: string;
    };

    expect(await settled(jobId)).toEqual({
      status: 'FAILED',
      result: null,
      error: LICENSES_MESSAGES.EXTRACTION_UNAVAILABLE,
    });
  });

  it("answers 404 when another user asks for someone else's job, and for unknown ids", async () => {
    extract.mockResolvedValue(EXTRACTION);
    const { job_id: jobId } = (await upload('user-a').expect(202)).body as {
      job_id: string;
    };

    await poll(jobId, 'user-b').expect(404);
    await poll('not-a-uuid').expect(404);
    await poll(jobId, 'user-a').expect(200);
  });

  it('rejects a non-PDF upload and a missing file with 422 before any job exists', async () => {
    await request(app.getHttpServer())
      .post('/licenses/extract')
      .set('x-user', 'user-a')
      .attach('document', Buffer.from('x'), {
        filename: 'a.jpg',
        contentType: 'image/jpeg',
      })
      .expect(422);
    await request(app.getHttpServer())
      .post('/licenses/extract')
      .set('x-user', 'user-a')
      .expect(422);
    expect(extract).not.toHaveBeenCalled();
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer()).get('/licenses/extract/x').expect(403);
  });
});
