import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, RequestMethod } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api', {
      exclude: [{ path: '/', method: RequestMethod.GET }],
    });
    await app.init();
  });

  it('/', () => {
    return request(app.getHttpServer()).get('/').expect(200).expect({
      status: 'ok',
      service: 'backend-biota-geom',
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
