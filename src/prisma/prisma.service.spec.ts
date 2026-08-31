import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { validateEnv } from '../config/env.validation';
import { PrismaModule } from './prisma.module';

// Complementa o teste de integração (`test/integration/prisma.service.integration-spec.ts`):
// aqui não precisamos de um Postgres de verdade, porque espionamos
// `$connect`/`$disconnect` do PrismaClient em vez de deixá-los rodar de
// verdade. O que queremos garantir é só o contrato de ciclo de vida do
// NestJS — que `onModuleInit`/`onModuleDestroy` realmente chamam esses
// métodos —, não que a conexão em si funciona (isso é responsabilidade do
// teste de integração).
describe('PrismaService (lifecycle)', () => {
  const originalEnv = { ...process.env };
  let connectSpy: jest.SpiedFunction<typeof PrismaClient.prototype.$connect>;
  let disconnectSpy: jest.SpiedFunction<
    typeof PrismaClient.prototype.$disconnect
  >;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3000';
    process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/db';

    connectSpy = jest
      .spyOn(PrismaClient.prototype, '$connect')
      .mockResolvedValue(undefined);
    disconnectSpy = jest
      .spyOn(PrismaClient.prototype, '$disconnect')
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it('connects on module init and disconnects on module destroy', async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
        PrismaModule,
      ],
    }).compile();

    const app: INestApplication = moduleFixture.createNestApplication();

    expect(connectSpy).not.toHaveBeenCalled();
    await app.init();
    expect(connectSpy).toHaveBeenCalledTimes(1);

    expect(disconnectSpy).not.toHaveBeenCalled();
    await app.close();
    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });
});
