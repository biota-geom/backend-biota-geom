# Backend Biota Geom

[![Quality](https://github.com/biota-geom/backend-biota-geom/actions/workflows/quality.yml/badge.svg)](https://github.com/biota-geom/backend-biota-geom/actions/workflows/quality.yml)

Backend em Node.js com TypeScript usando NestJS, PostgreSQL/PostGIS, Prisma e Docker.

Este README foi escrito para pessoas com níveis diferentes de experiência. Se você nunca trabalhou com NestJS ou backend web, siga o passo a passo na ordem.

## O Que Este Projeto Usa

- **Node.js**: runtime para executar JavaScript/TypeScript no backend.
- **TypeScript**: JavaScript com tipagem.
- **NestJS**: framework backend organizado em módulos, controllers e services.
- **PostgreSQL/PostGIS**: banco relacional com suporte a dados geoespaciais.
- **Prisma**: ORM usado para modelar o banco e acessar dados com tipagem.
- **Docker Compose**: sobe a API e o banco com poucos comandos.
- **Swagger**: página web para visualizar e testar endpoints da API.

## Pré-Requisitos

Instale antes de começar:

- Node.js 22 ou superior. A versão está fixada em `.nvmrc` e em `engines` no `package.json` — com nvm ou fnm, basta rodar `nvm use` na raiz do projeto. Em versões anteriores o `npm run test:mutation` não roda (o StrykerJS exige 22+).
- npm.
- Docker Desktop.
- WSL 2, se estiver no Windows.

No Windows, prefira rodar os comandos do projeto sempre no mesmo ambiente. Se você rodou `npm install` no WSL, continue usando o terminal WSL. Misturar PowerShell e WSL pode causar erro em binários como `prisma`, `nest`, `eslint` e `jest`.

## Primeiro Setup

Entre na pasta do projeto:

```bash
cd /mnt/c/backend-biota-geom
```

Instale as dependências:

```bash
npm install
```

Gere o Prisma Client:

```bash
npm run prisma:generate
```

## Rodando Tudo Com Docker

Este é o caminho mais simples para subir API e banco juntos.

```bash
npm run docker:up
```

Depois acesse:

```text
API:     http://localhost:3000
Swagger: http://localhost:3000/docs
```

Para parar os containers:

```bash
npm run docker:down
```

## Rodando Em Modo Desenvolvimento

Use este fluxo quando for programar no backend com reload automático.

Suba apenas o banco:

```bash
npm run db:up
```

Rode as migrations do Prisma:

```bash
npm run prisma:migrate
```

Inicie a API em modo watch:

```bash
npm run start:dev
```

Depois acesse:

```text
API:     http://localhost:3000
Swagger: http://localhost:3000/docs
```

Para parar apenas o banco:

```bash
npm run db:down
```

## Comandos Úteis

```bash
# Sobe API e banco com Docker
npm run docker:up

# Para e remove containers da aplicação
npm run docker:down

# Sobe apenas o banco
npm run db:up

# Para apenas o banco
npm run db:down

# Roda a API localmente
npm run start:dev

# Gera o Prisma Client
npm run prisma:generate

# Cria/aplica migrations em desenvolvimento
npm run prisma:migrate

# Abre interface visual do Prisma
npm run prisma:studio

# Roda ESLint com correção automática
npm run lint

# Compila o projeto
npm run build

# Roda testes unitários
npm test
```

## Testes

O projeto tem três tipos de teste, cada um com sua própria pasta/config:

| Tipo       | Onde fica                             | Sufixo                  | Depende de infra externa?                                                                     |
| ---------- | ------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------- |
| Unitário   | ao lado do arquivo testado, em `src/` | `*.spec.ts`             | Não                                                                                           |
| Integração | `test/integration/`                   | `*.integration-spec.ts` | Sim (Postgres via `npm run db:up`, em banco dedicado — ver [Banco de teste](#banco-de-teste)) |
| E2E        | `test/`                               | `*.e2e-spec.ts`         | Não hoje, mas exige uma `DATABASE_URL` válida no `.env` (ver [E2E Tests](#e2e-tests))         |

Use estes arquivos como referência ao escrever um teste novo:

- `src/config/env.validation.spec.ts`: como testar lógica de validação/fronteira pura (sem mocks, um cenário válido e um `it` por cenário de erro, incluindo asserção sobre a mensagem de erro).
- `src/prisma/prisma.service.spec.ts`: como testar o _contrato_ de ciclo de vida do Nest (`onModuleInit`/`onModuleDestroy`) sem precisar de banco — usa `jest.spyOn` no `PrismaClient.prototype` para verificar que `$connect`/`$disconnect` são chamados, sem se importar se a conexão em si funciona.
- `test/integration/prisma.service.integration-spec.ts`: como testar uma dependência real (banco) em vez de mockar — sobe o `PrismaModule` de verdade contra o Postgres do `docker-compose.yml` e valida uma query real. Precisa do banco no ar (`npm run db:up`) e de uma `DATABASE_URL` válida no `.env` (veja `.env.example`) — a conexão é redirecionada para o banco de teste, ver [Banco de teste](#banco-de-teste).

```bash
# Roda todos os testes unitários
npm run test:unit

# Roda um arquivo específico
npx jest src/config/env.validation.spec.ts

# Roda com relatório de cobertura
npm run test:cov

# Sobe o banco e roda os testes de integração
npm run db:up
npm run test:integration

# Roda os testes e2e (hoje não precisam do banco no ar, mas a app só sobe
# com uma DATABASE_URL válida no .env)
npm run test:e2e
```

### Banco de teste

Os testes de integração e e2e rodam num banco separado do de desenvolvimento. Quem cuida disso é o `globalSetup` do Jest em `test/global-setup.ts`, compartilhado pelas três configs que rodam esses testes (`test/jest-integration.json`, `test/jest-e2e.json` e `test/jest-stryker.json`): ele lê `TEST_DATABASE_URL`, cria esse banco no mesmo servidor Postgres caso ainda não exista (consultando `pg_database`, já que o Postgres não tem `CREATE DATABASE IF NOT EXISTS`) e injeta a URL em `process.env.DATABASE_URL` antes de qualquer teste subir.

Como o `@nestjs/config` não sobrescreve variáveis já presentes em `process.env` com o conteúdo do `.env`, é essa URL que chega ao `PrismaService`: a aplicação sob teste conecta em `biota_geom_test` e o `biota_geom` de desenvolvimento fica intocado. Hoje o único teste de integração só faz um `SELECT 1`, mas isso deixa de ser detalhe no primeiro teste que escrever ou limpar dados.

Se `TEST_DATABASE_URL` não estiver definida (ou estiver vazia), nada é alterado e os testes usam a `DATABASE_URL` normal. É assim que o CI roda, já que lá cada job sobe um Postgres efêmero e exclusivo — por isso o workflow não precisou de nenhuma alteração.

Localmente a criação do banco é automática (a variável já vem preenchida no `.env.example`), mas o schema não: rode uma vez `DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate deploy` para aplicar as migrations no banco de teste, e de novo sempre que uma nova migration entrar.

### Testes de mutação

Além dos testes acima, o projeto usa [StrykerJS](https://stryker-mutator.io/) para medir a qualidade da suíte de testes como um todo: ele altera pequenos trechos do código (ex: troca `>` por `>=`, remove uma âncora de regex) e roda os testes pra ver se algum falha. Se nenhum falhar, o "mutante sobreviveu" — sinal de que aquele trecho não está realmente sendo testado, só coberto.

Requer Node.js 22+ (`stryker` falha em versões anteriores) e o banco no ar (`npm run db:up`), já que o escopo inclui o teste de integração.

```bash
npm run db:up
npm run test:mutation
```

O relatório em HTML fica em `reports/mutation/mutation.html` (não versionado; no CI é publicado como artifact). Configuração em `stryker.conf.json`:

- Só muta `src/**/*.ts`, excluindo specs, `*.module.ts` (wiring de DI, sem lógica) e `main.ts` (bootstrap).
- Roda contra `test/jest-stryker.json`, uma config só para o Stryker que junta os testes **unitários e de integração** num único run (`*.spec.ts` + `*.integration-spec.ts`, sem os e2e). O objetivo é que o mutation score reflita a suíte inteira, não só a unitária — se rodasse só contra unit, tudo em `src/prisma/**` apareceria como `NoCoverage` mesmo estando coberto (pelo teste de integração), o que seria enganoso. Com `coverageAnalysis: "perTest"`, cada mutante só dispara os testes que realmente o cobrem, então isso não deixa o run inteiro lento — só os poucos mutantes do `PrismaService` acionam o teste de integração (com banco de verdade).
- `thresholds.break` está em `90`: o job `Mutation Tests` do CI falha se o score cair abaixo disso.

Três mutantes equivalentes são explicitamente ignorados com o comentário `// Stryker disable next-line all: <razão>`: dois em `prisma.service.ts` (a opção `infer` do `ConfigService.get` é só uma dica de tipo do TypeScript, não muda o valor em runtime) e um em `env.validation.ts` (o separador do `issue.path.join('.')`, que nunca chega a ser aplicado porque todo path deste schema plano tem um único segmento). Para que o comentário se ancorasse na linha certa, o `join` foi extraído para um `const` dentro do callback do `map` — o Stryker não associa o `disable next-line` a um encadeamento `.map().join()` escrito numa expressão só.

Os arquivos que já existiam quando o Stryker entrou (`env.validation.ts`, `prisma.service.ts`, `app.controller.ts`, `app.service.ts`) seguem sem mutante vivo além desses três. O módulo de autenticação, porém, entrou no escopo pelo merge da `main` sem nunca ter passado por teste de mutação, e derruba o score geral para 71.63% — abaixo do `thresholds.break`. Elevar esse número é trabalho de acompanhamento; veja o relatório HTML para a lista de sobreviventes por arquivo.

## Pre-commit Hook

O projeto usa [Husky](https://typicode.github.io/husky/) + [lint-staged](https://github.com/lint-staged/lint-staged).

A cada `git commit`, os arquivos staged são automaticamente corrigidos com ESLint (`--fix`) e formatados com Prettier antes do commit ser criado. Isso é instalado automaticamente ao rodar `npm install` (via `npm run prepare`).

Se o ESLint encontrar um erro que não pode corrigir sozinho, o commit é bloqueado até o problema ser corrigido manualmente.

## CI

O repositório possui workflows no GitHub Actions.

### Quality

Roda automaticamente em:

- todo pull request;
- todo push na branch `main`.

O workflow valida:

- lint com ESLint;
- formatação com Prettier;
- typecheck com TypeScript;
- testes unitários com Jest;
- testes de integração com Jest (job `Integration Tests`, sobe um Postgres via `services:`);
- testes e2e com Jest (job `E2E Tests`, também sobe um Postgres via `services:` — ver [Testes](#testes));
- testes de mutação com StrykerJS (job `Mutation Tests`, mínimo de 90% de mutation score — ver [Testes de mutação](#testes-de-mutação));
- schema do Prisma com `prisma validate`.

Para rodar localmente as mesmas validações principais:

```bash
npm run prisma:generate
npm run check
```

Se alguma validação falhar, o PR deve ser corrigido antes de ser aprovado.

### Integration Tests

Roda em todo pull request e todo push na branch `main`.

Sobe um container Postgres (mesma imagem do `docker-compose.yml`) como `services:` do job, aplica as migrations (`prisma migrate deploy`) e roda `npm run test:integration` contra ele. Não depende do `docker-compose.yml` local — a `DATABASE_URL` é apontada direto para o serviço do GitHub Actions.

O passo `prisma migrate deploy` está nos três jobs que usam banco (`Integration Tests`, `E2E Tests` e `Mutation Tests`), aplicando as migrations de `prisma/migrations/` no Postgres efêmero antes de qualquer teste rodar.

### E2E Tests

Roda em todo pull request e todo push na branch `main`.

O `AppModule` valida as env vars na inicialização, então a app de `test/app.e2e-spec.ts` só sobe com uma `DATABASE_URL` válida. O banco em si, hoje, não chega a ser tocado: `$connect()` com o driver adapter `@prisma/adapter-pg` é preguiçoso — o pool do `pg` só abre conexão de fato na primeira query, e o endpoint de health não consulta nada. Dá para confirmar apontando a `DATABASE_URL` para uma porta morta: os e2e passam, enquanto os de integração falham com `PrismaClientKnownRequestError`.

Ainda assim o job sobe um container Postgres como `services:` e aplica as migrations, para que o primeiro teste e2e que realmente consultar o banco funcione sem precisar mexer no workflow.

### Mutation Tests

Roda em todo pull request e todo push na branch `main`, depois que os jobs `Unit Tests` e `Integration Tests` passarem (`needs: [unit-tests, integration-tests]` — sem isso, o Stryker reexecutaria a suíte inteira contra vários mutantes mesmo quando os testes base já falharam, desperdiçando o job mais lento do pipeline).

Sobe o mesmo container Postgres do job `Integration Tests` (o escopo da mutação inclui os testes de integração — ver [Testes de mutação](#testes-de-mutação)), aplica as migrations, executa `npm run test:mutation` e falha o job se o mutation score ficar abaixo de 90% (`thresholds.break` em `stryker.conf.json`). O relatório HTML é publicado como artifact do workflow (`mutation-report`), disponível na aba **Summary** da execução.

### Coverage (Changed Files)

Roda apenas em pull requests.

Compara o PR com a branch base e verifica se **cada arquivo `.ts` alterado em `src/`** (exceto `*.spec.ts`) atinge um mínimo de cobertura: 85% para statements, functions e lines, e 85% para branches — **exceto em arquivos que usam pelo menos um decorator** (`@Injectable()`, `@Controller()`, `@ApiProperty()`, etc.), onde `branches` cai para 70%. Arquivos legados não tocados no PR não entram nessa checagem — o objetivo é elevar a cobertura aos poucos, sem travar o repositório todo de uma vez.

O limite reduzido de `branches` é escopado a arquivos decorados de propósito: a emissão de metadados de decorators do TypeScript (`__decorate`/`__metadata`) cria uma entrada `design:paramtypes` para cada parâmetro de constructor, parâmetro de método e propriedade de classe decorados, e o remapeamento via source map do Istanbul atribui branches fantasmas (`cond-expr`/`binary-expr`) a essas linhas de declaração — branches que não correspondem a nenhuma condicional real no código e não podem ser exercitadas por nenhum teste. Isso é um artefato de instrumentação do ts-jest/Istanbul (confirmado via reprodução isolada, independente de cenários de teste, configuração do `tsconfig` e do coverage provider), não código sem teste. Um arquivo de domínio puro sem decorators (política de senha, parsing de duração, utilitários) não recebe essa folga e continua exigido em 85% de branches reais.

Um arquivo alterado que não aparece no `coverage-summary.json` é tratado como falha (`not covered by any test`), com uma exceção: arquivos que compilam para nada além de boilerplate — só `interface`/`type` exportados — não têm o que instrumentar e são ignorados. O script distingue os dois casos recompilando o arquivo isoladamente, porque o summary colapsa ambos em "sem entrada". `src/jest.setup-env.ts` é infraestrutura de teste e fica fora do gate por uma lista explícita.

Wiring do Nest (`main.ts`, `*.module.ts`) **não** é excluído do `collectCoverageFrom`: `src/main.spec.ts` e os `*.module.spec.ts` carregam esses arquivos, então eles entram no summary normalmente. (O `mutate` do Stryker segue excluindo os dois — lá o critério é outro: não há mutante interessante em wiring de DI.)

O gate também aborta se o summary vier sem nenhuma entrada por arquivo, para não passar "vazio" caso a configuração de cobertura quebre.

Para rodar a mesma checagem localmente:

```bash
npm run prisma:generate
npm run test:cov -- --coverageReporters=json-summary --coverageReporters=text-summary
BASE_REF=main node .github/scripts/check-changed-coverage.js
```

### Docker Build

Roda em todo pull request e todo push na branch `main`.

Builda a imagem a partir do `Dockerfile` (sem publicar em nenhum registry) para garantir que o build multi-stage continua funcionando antes do merge.

### PR Title Lint

Roda em todo pull request (ao abrir, editar ou atualizar).

Valida se o título do PR segue o padrão [Conventional Commits](https://www.conventionalcommits.org/), por exemplo:

```text
feat: adiciona endpoint de busca por espécie
fix: corrige cálculo de área do polígono
chore: atualiza dependências
docs: atualiza README
```

Esse título é usado como mensagem de commit no squash merge, então mantê-lo no padrão facilita gerar changelog e histórico legível.

## Variáveis De Ambiente

O arquivo `.env.example` mostra as variáveis necessárias:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL="postgresql://biota:biota@localhost:5432/biota_geom?schema=public"
TEST_DATABASE_URL="postgresql://biota:biota@localhost:5432/biota_geom_test?schema=public"

JWT_ACCESS_SECRET=replace-with-a-random-secret-at-least-32-characters-access
JWT_REFRESH_SECRET=replace-with-a-random-secret-at-least-32-characters-refresh
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
JWT_ISSUER=biota-geom-api
JWT_AUDIENCE=biota-geom-web

AUTH_ALLOWED_EMAIL_DOMAIN=biotageom.com.br

CORS_ORIGINS=http://localhost:5173
```

Gere segredos de JWT distintos por ambiente, por exemplo com `openssl rand -base64 48`. `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` nunca podem ser iguais, e valores de exemplo do `.env.example` são rejeitados automaticamente quando `NODE_ENV=production`.

Para desenvolvimento local, a API usa o `.env`.

Dentro do Docker Compose, a API usa outra `DATABASE_URL`, apontando para o serviço interno `postgres`:

```text
postgresql://biota:biota@postgres:5432/biota_geom?schema=public
```

Isso é normal: fora do Docker usamos `localhost`; dentro do Docker usamos o nome do serviço.

### Validação Das Variáveis De Ambiente

As variáveis são validadas na inicialização da aplicação (`src/config/env.validation.ts`, usando [Zod](https://zod.dev/)):

- `NODE_ENV`: `development`, `production` ou `test` (padrão: `development`);
- `PORT`: número inteiro positivo (padrão: `3000`);
- `DATABASE_URL`: URL válida com protocolo `postgres` ou `postgresql`;
- `TEST_DATABASE_URL`: opcional, usada só pelos testes de integração e e2e (ver [Banco de teste](#banco-de-teste)); não é validada pelo schema porque não faz parte do ambiente da aplicação;
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`: strings com no mínimo 32 caracteres, obrigatoriamente diferentes entre si;
- `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL`: duração no formato `15m`, `7d`, etc. (padrão: `15m` / `7d`);
- `JWT_ISSUER` / `JWT_AUDIENCE`: identificadores do emissor/audiência do token (padrão: `biota-geom-api` / `biota-geom-web`);
- `AUTH_ALLOWED_EMAIL_DOMAIN`: único domínio de e-mail autorizado a se cadastrar (padrão: `biotageom.com.br`);
- `CORS_ORIGINS`: lista de origens (separadas por vírgula) autorizadas a chamar a API (padrão: `http://localhost:5173`).

Se alguma variável estiver ausente ou em formato inválido, a aplicação falha imediatamente ao iniciar, com uma mensagem listando exatamente o que está errado, em vez de falhar depois com um erro genérico de conexão com o banco.

## Swagger

O Swagger fica em:

```text
http://localhost:3000/docs
```

Use essa página para visualizar endpoints, contratos de entrada e saída, e testar chamadas HTTP sem precisar de Postman ou Insomnia.

Sempre que criar um controller novo, adicione decorators do Swagger, como:

```ts
@ApiTags('nome-do-modulo')
@ApiOkResponse({ description: 'Descrição da resposta.' })
```

## Estrutura Atual De Pastas

```text
src/
  app.controller.ts
  app.module.ts
  app.service.ts
  main.ts
  config/
    env.validation.ts
  prisma/
    prisma.module.ts
    prisma.service.ts

prisma/
  schema.prisma

test/
  app.e2e-spec.ts
  integration/
    prisma.service.integration-spec.ts
```

Explicação rápida:

- `src/main.ts`: ponto de entrada da aplicação. Cria o app Nest e configura Swagger.
- `src/app.module.ts`: módulo raiz. Importa os módulos usados pela aplicação.
- `src/app.controller.ts`: controller inicial, hoje com o endpoint de health.
- `src/app.service.ts`: service inicial usado pelo controller.
- `src/config/env.validation.ts`: validação das variáveis de ambiente na inicialização.
- `src/prisma/prisma.module.ts`: módulo global que disponibiliza o Prisma.
- `src/prisma/prisma.service.ts`: serviço responsável por conectar/desconectar do banco.
- `prisma/schema.prisma`: modelos do banco e configuração do Prisma.
- `test/`: testes end-to-end e de integração (ver [Testes](#testes)).

## Como Criar Novas Features

Para manter o projeto organizado, cada feature deve ficar em uma pasta própria dentro de `src/modules`.

Exemplo para uma feature `users`:

```text
src/modules/users/
  domain/
    user.entity.ts
    user.repository.ts
  application/
    create-user.use-case.ts
    find-user.use-case.ts
  infra/
    prisma-user.repository.ts
  presentation/
    users.controller.ts
    dtos/
      create-user.dto.ts
  users.module.ts
```

Responsabilidade de cada camada:

- `domain`: regras centrais do negócio. Não deve depender de Nest, Prisma ou HTTP.
- `application`: casos de uso. Coordena regras do domínio e portas/repositórios.
- `infra`: implementações técnicas, como Prisma, integrações externas e persistência.
- `presentation`: entrada da aplicação, como controllers HTTP e DTOs.
- `*.module.ts`: registra controllers, providers e dependências no Nest.

## Como Seguir SOLID

SOLID não é uma pasta específica; é uma forma de organizar responsabilidades.

Diretrizes práticas para este projeto:

- Controller não deve conter regra de negócio. Ele recebe HTTP, valida DTOs e chama um caso de uso ou service.
- Caso de uso deve representar uma ação clara, como `CreateUserUseCase`.
- Prisma não deve ser chamado diretamente pelo controller.
- Regras de negócio devem ficar no `domain` ou em casos de uso, não em queries soltas.
- Dependa de abstrações quando fizer sentido. Exemplo: um caso de uso depende de `UserRepository`, e a infra fornece `PrismaUserRepository`.
- Arquivos devem ter responsabilidade pequena e clara.
- Testes devem focar regras e casos de uso, não apenas controllers.

Exemplo de fluxo recomendado:

```text
HTTP request
  -> Controller
  -> Use case
  -> Repository interface
  -> Prisma repository
  -> PostgreSQL
```

## Prisma E Banco De Dados

Os modelos do banco ficam em:

```text
prisma/schema.prisma
```

Depois de alterar modelos, rode:

```bash
npm run prisma:migrate
```

Esse comando cria uma migration e aplica no banco local.

Se apenas precisar regenerar o client:

```bash
npm run prisma:generate
```

## Checklist Antes De Subir Código

Antes de abrir PR ou subir alterações:

```bash
npm run lint
npm run build
npm test
```

Se mexeu no banco:

```bash
npm run prisma:migrate
```

Confirme também se o Swagger continua abrindo:

```text
http://localhost:3000/docs
```
