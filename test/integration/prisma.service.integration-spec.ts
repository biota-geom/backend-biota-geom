import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { validateEnv } from '../../src/config/env.validation';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';

// Teste de integração de referência: diferente do unit test de
// `env.validation.spec.ts` (função pura, sem I/O), aqui queremos provar que
// o `PrismaService` realmente conecta num Postgres de verdade através do
// `PrismaPg` adapter — algo que um teste unitário com mocks não consegue
// validar (um mock de PrismaClient nunca detectaria uma connection string
// errada, uma extensão do Postgres faltando, etc).
//
// Pré-requisito: banco de teste rodando (`npm run db:up`) e acessível pela
// mesma DATABASE_URL usada em desenvolvimento (ver `.env.example`).
//
// Roda separado dos testes unitários porque depende de infra externa:
//   npm run test:integration
describe('PrismaService (integration)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

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
    }).compile();

    app = moduleFixture.createNestApplication();
    // `app.init()` dispara o ciclo de vida do Nest (incluindo
    // `PrismaService.onModuleInit`, que chama `$connect()`), assim como
    // acontece na aplicação real.
    await app.init();

    prismaService = app.get(PrismaService);
  });

  afterAll(async () => {
    // Dispara `PrismaService.onModuleDestroy` (`$disconnect()`).
    await app.close();
  });

  it('connects to the real database and executes a query', async () => {
    const result = await prismaService.$queryRaw<{ result: number }[]>`
      SELECT 1 as result
    `;

    expect(result).toEqual([{ result: 1 }]);
  });
});
