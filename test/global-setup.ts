import { execFileSync } from 'node:child_process';
import { config as loadEnvFile } from 'dotenv';
import { Client } from 'pg';

// Banco de manutenção: não dá para executar `CREATE DATABASE` estando
// conectado ao banco que se quer criar, então a conexão é feita neste.
const MAINTENANCE_DATABASE = 'postgres';

/**
 * Cria o banco apontado por `databaseUrl` caso ele ainda não exista.
 * O Postgres não tem `CREATE DATABASE IF NOT EXISTS`, então é preciso
 * consultar `pg_database` antes.
 */
async function ensureDatabaseExists(databaseUrl: string): Promise<void> {
  const databaseName = decodeURIComponent(
    new URL(databaseUrl).pathname.slice(1),
  );

  if (!databaseName) {
    throw new Error(
      `TEST_DATABASE_URL não aponta para nenhum banco: ${databaseUrl}`,
    );
  }

  // Mesmo host e mesmas credenciais, só trocando o banco. Os parâmetros de
  // query (ex.: `?schema=public`) são do Prisma, não do driver `pg`.
  const maintenanceUrl = new URL(databaseUrl);
  maintenanceUrl.pathname = `/${MAINTENANCE_DATABASE}`;
  maintenanceUrl.search = '';

  const client = new Client({ connectionString: maintenanceUrl.toString() });
  await client.connect();

  try {
    const { rowCount } = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [databaseName],
    );

    if (rowCount === 0) {
      // Nome de banco é identificador: não pode ir como parâmetro ($1). Vai
      // entre aspas duplas, com as aspas internas escapadas.
      await client.query(
        `CREATE DATABASE "${databaseName.replace(/"/g, '""')}"`,
      );
      console.log(`[jest] banco de teste criado: ${databaseName}`);
    }
  } finally {
    await client.end();
  }
}

/**
 * Aplica as migrations no banco de teste recém-criado. O CI não passa por aqui
 * (lá não existe `TEST_DATABASE_URL`: cada job sobe um Postgres efêmero e roda
 * `npx prisma migrate deploy` antes do Jest), mas localmente o banco criado
 * acima nasce vazio — sem isto, qualquer suíte que toque em tabelas encontra
 * um schema inexistente.
 */
function applyMigrations(databaseUrl: string): void {
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    // Só a URL muda: o prisma.config.ts lê DATABASE_URL do ambiente.
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });
}

/**
 * `globalSetup` compartilhado pelas suítes de integração e e2e: isola os
 * testes num banco dedicado, para que nenhum teste que escreva ou limpe dados
 * encoste no banco de desenvolvimento.
 */
export default async function globalSetup(): Promise<void> {
  // O Jest não carrega o `.env` sozinho. `override: false` (padrão do dotenv)
  // garante que variáveis já presentes no ambiente vençam o arquivo.
  loadEnvFile({ quiet: true });

  const testDatabaseUrl = process.env.TEST_DATABASE_URL;

  // Sem `TEST_DATABASE_URL` nada é alterado e a app sob teste continua usando
  // a `DATABASE_URL` do ambiente. É assim que o CI roda: lá cada job já sobe
  // um Postgres efêmero e exclusivo, então não há banco de dev a proteger.
  if (!testDatabaseUrl) {
    return;
  }

  await ensureDatabaseExists(testDatabaseUrl);
  applyMigrations(testDatabaseUrl);

  // Os workers do Jest são criados depois do `globalSetup` e herdam este
  // `process.env`; o `@nestjs/config`, por sua vez, não sobrescreve o que já
  // está em `process.env` com o conteúdo do `.env`. Logo, é este valor que
  // chega ao `PrismaService`.
  process.env.DATABASE_URL = testDatabaseUrl;
}
