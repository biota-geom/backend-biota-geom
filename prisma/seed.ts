import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from '@node-rs/argon2';
import {
  AddressType,
  ConditionPeriodicity,
  ConditionStatus,
  ConditionType,
  DocumentType,
  EsgPillar,
  LicenseStatus,
  LicenseType,
  PrismaClient,
} from '@prisma/client';

const seedIssuingAgencies = [
  { name: 'Fundação Estadual de Proteção Ambiental', acronym: 'FEPAM' },
  { name: 'Instituto Brasileiro do Meio Ambiente', acronym: 'IBAMA' },
  { name: 'Fundação do Meio Ambiente', acronym: 'FATMA' },
  {
    name: 'Instituto Estadual do Ambiente',
    acronym: 'INEA',
  },
  {
    name: 'Companhia Ambiental do Estado de São Paulo',
    acronym: 'CETESB',
  },
  { name: 'Fundação Estadual do Meio Ambiente', acronym: 'FEAM' },
];

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/*
 * Senha única para todas as contas de seed. O hash é gerado com o mesmo
 * Argon2id usado pelo Argon2PasswordHasher em runtime — um hash literal de
 * exemplo não passa no `verify` do login, então as contas ficariam inúteis.
 */
const SEED_PASSWORD = 'Senha@1234';

/*
 * O domínio precisa bater com AUTH_ALLOWED_EMAIL_DOMAIN, senão as contas do
 * seed ficam inconsistentes com o que o /auth/register aceita criar.
 */
const SEED_EMAIL_DOMAIN =
  process.env.AUTH_ALLOWED_EMAIL_DOMAIN ?? 'biotageom.com.br';

/*
 * Base das URLs de PDF das licenças. A coluna `documentUrl` guarda a URL
 * absoluta devolvida pelo driver de storage (local ou S3); no seed é só um
 * endereço de exemplo — o arquivo em si não é criado.
 */
const SEED_DOCUMENT_BASE_URL =
  process.env.SEED_DOCUMENT_BASE_URL ?? 'http://localhost:3000/uploads/seed';

/*
 * Janela (em dias) em que uma licença ainda válida passa a ser "ATTENTION".
 * Deve espelhar a regra do CreateLicenseUseCase, que calcula o status a partir
 * de `expirationDate` — ajuste aqui se o valor de lá for diferente.
 */
const LICENSE_ATTENTION_WINDOW_DAYS = 90;

const seedUsers = [
  { name: 'Ana Administradora', local: 'admin', isAdmin: true, isActive: true },
  {
    name: 'Carlos Analista',
    local: 'carlos.analista',
    isAdmin: false,
    isActive: true,
  },
  {
    name: 'Julia Auditora (conta inativa)',
    local: 'julia.auditora',
    isAdmin: false,
    isActive: false,
  },
];

const seedSectors = [
  { name: 'Mineração', description: 'Extração e beneficiamento mineral.' },
  { name: 'Agronegócio', description: 'Produção agrícola e agroindústria.' },
  {
    name: 'Siderurgia',
    description: 'Processamento e transformação de metais.',
  },
  {
    name: 'Energia Renovável',
    description: 'Geração solar, eólica e biomassa.',
  },
  { name: 'Saneamento', description: 'Tratamento de água e efluentes.' },
  {
    name: 'Papel e Celulose',
    description: 'Florestas plantadas e produção de celulose.',
  },
];

const seedEsgMetrics = [
  { name: 'Consumo de Água', unit: 'm³', pillar: EsgPillar.AMBIENTAL },
  {
    name: 'Emissão de CO2 Equivalente',
    unit: 'ton',
    pillar: EsgPillar.AMBIENTAL,
  },
  {
    name: 'Resíduos Sólidos Gerados',
    unit: 'ton',
    pillar: EsgPillar.AMBIENTAL,
  },
  { name: 'Consumo de Energia', unit: 'kWh', pillar: EsgPillar.AMBIENTAL },
  {
    name: 'Horas de Treinamento em Segurança',
    unit: 'horas',
    pillar: EsgPillar.SOCIAL,
  },
  { name: 'Número de Funcionários', unit: 'pessoas', pillar: EsgPillar.SOCIAL },
  {
    name: 'Não Conformidades Ambientais',
    unit: 'ocorrências',
    pillar: EsgPillar.GOVERNANCA,
  },
];

/*
 * `owner` é o login (parte local do e-mail) da conta dona da empresa — no
 * modelo, `User` é a consultoria que assina o sistema e `Customer` é a empresa
 * atendida por ela. A carteira é dividida entre duas contas de propósito: ao
 * entrar com `admin` e depois com `carlos.analista` as listas têm que vir
 * diferentes (e nenhuma vazia), que é a demonstração manual da US10.
 *
 * Carteira variada de propósito: segmentos e UFs repetidos em combinações
 * diferentes, unidades ativas e inativas, para exercitar a listagem (US03) e
 * a busca/filtros (US05) com resultados que de fato mudam conforme o filtro.
 * `state` usa a sigla da UF porque o card exibe "Cidade - Estado".
 */
const seedCompanies = [
  {
    name: 'Unidade Industrial Ouro Preto',
    document: '12.345.678/0001-95',
    owner: 'admin',
    sector: 'Mineração',
    isActive: true,
    email: 'contato@mineracaoop.com.br',
    ownerName: 'Roberto Andrade',
    ownerPhone: '+55 31 99988-7766',
    metrics: ['Consumo de Água', 'Resíduos Sólidos Gerados'],
    address: {
      street: 'Rodovia dos Minérios',
      number: 'KM 12',
      city: 'Ouro Preto',
      state: 'MG',
      postalCode: '35400-000',
    },
  },
  {
    name: 'Complexo Minerário Carajás',
    document: '23.456.789/0001-95',
    owner: 'admin',
    sector: 'Mineração',
    isActive: true,
    email: 'ambiental@carajasmin.com.br',
    ownerName: 'Fernanda Lopes',
    ownerPhone: '+55 94 99877-6655',
    metrics: ['Consumo de Água', 'Emissão de CO2 Equivalente'],
    address: {
      street: 'Avenida dos Carajás',
      number: '2100',
      city: 'Parauapebas',
      state: 'PA',
      postalCode: '68515-000',
    },
  },
  {
    name: 'EcoVerde Agroindústria S.A.',
    document: '34.567.890/0001-30',
    owner: 'admin',
    sector: 'Agronegócio',
    isActive: true,
    email: 'contato@ecoverde.com.br',
    ownerName: 'Mariana Souza',
    ownerPhone: '+55 51 99988-7766',
    metrics: ['Consumo de Água', 'Número de Funcionários'],
    address: {
      street: 'Avenida das Palmeiras',
      number: '1000',
      city: 'Porto Alegre',
      state: 'RS',
      postalCode: '90000-000',
    },
  },
  {
    name: 'Fazenda Santa Clara - Unidade Sorriso',
    document: '45.678.901/0001-75',
    owner: 'admin',
    sector: 'Agronegócio',
    isActive: false,
    email: 'santaclara@agro.com.br',
    ownerName: 'Paulo Menezes',
    ownerPhone: '+55 66 99766-5544',
    metrics: ['Consumo de Água'],
    address: {
      street: 'Rodovia BR-163',
      number: 'KM 740',
      city: 'Sorriso',
      state: 'MT',
      postalCode: '78890-000',
    },
  },
  {
    name: 'MetalAço Brasil Ltda',
    document: '56.789.012/0001-00',
    owner: 'admin',
    sector: 'Siderurgia',
    isActive: true,
    email: 'contato@metalaco.com.br',
    ownerName: 'Carlos Aço',
    ownerPhone: '+55 31 97766-5544',
    metrics: [
      'Emissão de CO2 Equivalente',
      'Consumo de Energia',
      'Horas de Treinamento em Segurança',
    ],
    address: {
      street: 'Avenida Siderúrgica',
      number: '450',
      city: 'Ipatinga',
      state: 'MG',
      postalCode: '35160-000',
    },
  },
  {
    name: 'Usina Siderúrgica Volta Redonda',
    document: '67.890.123/0001-16',
    owner: 'admin',
    sector: 'Siderurgia',
    isActive: false,
    email: 'meioambiente@usinavr.com.br',
    ownerName: 'Helena Martins',
    ownerPhone: '+55 24 99655-4433',
    metrics: ['Emissão de CO2 Equivalente'],
    address: {
      street: 'Rua da Fundição',
      number: '88',
      city: 'Volta Redonda',
      state: 'RJ',
      postalCode: '27255-000',
    },
  },
  {
    name: 'SolBrilho Energia Limpa',
    document: '78.901.234/0001-05',
    owner: 'carlos.analista',
    sector: 'Energia Renovável',
    isActive: true,
    email: 'contato@solbrilho.com.br',
    ownerName: 'Mariana Luz',
    ownerPhone: '+55 11 98877-6655',
    metrics: ['Consumo de Energia', 'Número de Funcionários'],
    address: {
      street: 'Rua do Sol',
      number: '450',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '01000-000',
    },
  },
  {
    name: 'Parque Eólico Serra do Vento',
    document: '89.012.345/0001-79',
    owner: 'carlos.analista',
    sector: 'Energia Renovável',
    isActive: true,
    email: 'operacao@serradovento.com.br',
    ownerName: 'Ricardo Nunes',
    ownerPhone: '+55 84 99544-3322',
    metrics: ['Consumo de Energia'],
    address: {
      street: 'Estrada da Serra',
      number: 's/n',
      city: 'Serra do Mel',
      state: 'RN',
      postalCode: '59660-000',
    },
  },
  {
    name: 'Estação de Tratamento Vale Azul',
    document: '90.123.456/0001-31',
    owner: 'carlos.analista',
    sector: 'Saneamento',
    isActive: true,
    email: 'eta@valeazul.com.br',
    ownerName: 'Beatriz Ramos',
    ownerPhone: '+55 62 99433-2211',
    metrics: ['Consumo de Água', 'Não Conformidades Ambientais'],
    address: {
      street: 'Avenida das Águas',
      number: '75',
      city: 'Goiânia',
      state: 'GO',
      postalCode: '74000-000',
    },
  },
  {
    name: 'Celulose Rio Branco',
    document: '01.234.567/0001-95',
    owner: 'admin',
    sector: 'Papel e Celulose',
    isActive: true,
    email: 'ambiental@celuloseriobranco.com.br',
    ownerName: 'Tiago Ferraz',
    ownerPhone: '+55 27 99322-1100',
    metrics: ['Consumo de Água', 'Resíduos Sólidos Gerados'],
    address: {
      street: 'Rodovia do Eucalipto',
      number: 'KM 30',
      city: 'Aracruz',
      state: 'ES',
      postalCode: '29190-000',
    },
  },
  /*
   * Registro excluído logicamente: não deve aparecer na listagem nem no
   * detalhe. Serve de regressão para o filtro de soft delete do GET
   * /customers e /customers/:id.
   */
  {
    name: 'Unidade Desativada (soft delete)',
    document: '11.222.333/0001-81',
    owner: 'admin',
    sector: 'Mineração',
    isActive: false,
    isDeleted: true,
    email: 'arquivo@desativada.com.br',
    ownerName: 'Registro Arquivado',
    ownerPhone: '+55 00 00000-0000',
    metrics: [],
    address: {
      street: 'Rua Desativada',
      number: '0',
      city: 'Curitiba',
      state: 'PR',
      postalCode: '80000-000',
    },
  },
];

/*
 * Datas relativas a "hoje" (em dias; negativo = passado). Datas fixas
 * envelheceriam: uma licença semeada como "Regular" viraria "Vencida" meses
 * depois sem ninguém mexer. Com offsets, cada execução do seed reposiciona as
 * datas e recalcula o status, então a demonstração cobre sempre os três
 * estados (Regular / Atenção / Vencida).
 */
interface SeedCondition {
  itemNumber: string;
  title: string;
  description: string;
  responsibleName: string;
  // Parâmetro GRI (nome em seedEsgMetrics) que categoriza a condicionante. Tem
  // que estar entre os `metrics` da empresa, como a API exige (US02/US23).
  esgMetric: string;
  conditionType: ConditionType;
  // Só faz sentido para PERIODIC.
  periodicity?: ConditionPeriodicity;
  // Prazo único (típico de INFORMATIVE).
  deadlineInDays?: number;
  // Próximo vencimento (típico de PERIODIC).
  dueInDays?: number;
  alertInDays?: number;
  // Se informado, a condicionante está cumprida.
  completedInDays?: number;
}

interface SeedLicense {
  company: string; // nome da empresa em seedCompanies
  type: LicenseType;
  agency: string; // sigla em seedIssuingAgencies
  processNumber: string;
  issuedInDays: number;
  expiresInDays: number;
  conditions: SeedCondition[];
}

/*
 * Cobertura pensada para a listagem/filtros de licenças:
 * - os três tipos (LP, LI, LO) e os três status;
 * - órgãos emissores diferentes;
 * - licenças sem condicionantes, com condicionantes em andamento, vencidas
 *   e cumpridas, informativas e periódicas em todas as periodicidades.
 */
const seedLicenses: SeedLicense[] = [
  {
    company: 'Unidade Industrial Ouro Preto',
    type: LicenseType.LO,
    agency: 'FEAM',
    processNumber: '2023.05.01.003.0001234',
    issuedInDays: -900,
    expiresInDays: 400, // REGULAR
    conditions: [
      {
        itemNumber: '1.1',
        title: 'Monitoramento da qualidade da água',
        description:
          'Realizar análise trimestral da qualidade da água superficial a montante e a jusante do empreendimento, com laudo de laboratório acreditado.',
        responsibleName: 'Roberto Andrade',
        esgMetric: 'Consumo de Água',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.QUARTERLY,
        dueInDays: 30,
        alertInDays: 15,
      },
      {
        itemNumber: '1.2',
        title: 'Destinação de resíduos sólidos',
        description:
          'Apresentar semestralmente os manifestos de transporte e certificados de destinação final dos resíduos gerados.',
        responsibleName: 'Roberto Andrade',
        esgMetric: 'Resíduos Sólidos Gerados',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.SEMIANNUAL,
        dueInDays: -10, // OVERDUE
        alertInDays: -25,
      },
      {
        itemNumber: '2.1',
        title: 'Apresentação do Plano de Controle Ambiental',
        description:
          'Protocolar o Plano de Controle Ambiental (PCA) atualizado junto ao órgão licenciador.',
        responsibleName: 'Roberto Andrade',
        esgMetric: 'Consumo de Água',
        conditionType: ConditionType.INFORMATIVE,
        deadlineInDays: -60,
        completedInDays: -75, // FULFILLED
      },
    ],
  },
  {
    company: 'Unidade Industrial Ouro Preto',
    type: LicenseType.LI,
    agency: 'IBAMA',
    processNumber: '02001.004512/2019-31',
    issuedInDays: -1500,
    expiresInDays: -200, // EXPIRED
    conditions: [],
  },
  {
    company: 'Complexo Minerário Carajás',
    type: LicenseType.LO,
    agency: 'IBAMA',
    processNumber: '02001.009876/2021-17',
    issuedInDays: -700,
    expiresInDays: 45, // ATTENTION
    conditions: [
      {
        itemNumber: '1.1',
        title: 'Inventário de emissões atmosféricas',
        description:
          'Elaborar e enviar o inventário anual de emissões de gases de efeito estufa das operações.',
        responsibleName: 'Fernanda Lopes',
        esgMetric: 'Emissão de CO2 Equivalente',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.ANNUAL,
        dueInDays: 40,
        alertInDays: 10,
      },
      {
        itemNumber: '1.2',
        title: 'Programa de educação ambiental',
        description:
          'Implementar o programa de educação ambiental junto às comunidades do entorno.',
        responsibleName: 'Fernanda Lopes',
        esgMetric: 'Consumo de Água',
        conditionType: ConditionType.INFORMATIVE,
        deadlineInDays: 90,
      },
    ],
  },
  {
    company: 'EcoVerde Agroindústria S.A.',
    type: LicenseType.LO,
    agency: 'FEPAM',
    processNumber: '000123-05.67/23.4',
    issuedInDays: -365,
    expiresInDays: 700, // REGULAR
    conditions: [
      {
        itemNumber: '1',
        title: 'Monitoramento de efluentes',
        description:
          'Enviar mensalmente o relatório de automonitoramento dos efluentes tratados, com os parâmetros da licença.',
        responsibleName: 'Mariana Souza',
        esgMetric: 'Consumo de Água',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.MONTHLY,
        dueInDays: 12,
        alertInDays: 5,
      },
    ],
  },
  {
    company: 'EcoVerde Agroindústria S.A.',
    type: LicenseType.LP,
    agency: 'FEPAM',
    processNumber: '000987-05.67/18.2',
    issuedInDays: -1200,
    expiresInDays: -30, // EXPIRED
    conditions: [],
  },
  {
    company: 'MetalAço Brasil Ltda',
    type: LicenseType.LO,
    agency: 'FEAM',
    processNumber: '2022.03.01.002.0004567',
    issuedInDays: -1000,
    expiresInDays: 60, // ATTENTION
    conditions: [
      {
        itemNumber: '1.1',
        title: 'Monitoramento de emissões de chaminé',
        description:
          'Realizar amostragem semestral das emissões das chaminés dos fornos e enviar o laudo ao órgão.',
        responsibleName: 'Carlos Aço',
        esgMetric: 'Emissão de CO2 Equivalente',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.SEMIANNUAL,
        dueInDays: 25,
        alertInDays: 10,
      },
      {
        itemNumber: '1.2',
        title: 'Monitoramento da qualidade do ar',
        description:
          'Manter estação de monitoramento da qualidade do ar e apresentar relatório trimestral.',
        responsibleName: 'Carlos Aço',
        esgMetric: 'Emissão de CO2 Equivalente',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.QUARTERLY,
        dueInDays: -5, // OVERDUE
        alertInDays: -20,
      },
    ],
  },
  {
    company: 'Usina Siderúrgica Volta Redonda',
    type: LicenseType.LO,
    agency: 'INEA',
    processNumber: 'E-07/002.1234/2016',
    issuedInDays: -2000,
    expiresInDays: -120, // EXPIRED
    conditions: [],
  },
  {
    company: 'Celulose Rio Branco',
    type: LicenseType.LO,
    agency: 'IBAMA',
    processNumber: '02001.005555/2022-08',
    issuedInDays: -800,
    expiresInDays: 1000, // REGULAR
    conditions: [],
  },
  {
    company: 'SolBrilho Energia Limpa',
    type: LicenseType.LI,
    agency: 'CETESB',
    processNumber: '55/00123/22',
    issuedInDays: -300,
    expiresInDays: 500, // REGULAR
    conditions: [],
  },
  {
    company: 'Parque Eólico Serra do Vento',
    type: LicenseType.LP,
    agency: 'IBAMA',
    processNumber: '02001.001111/2024-44',
    issuedInDays: -200,
    expiresInDays: 900, // REGULAR
    conditions: [],
  },
  {
    company: 'Estação de Tratamento Vale Azul',
    type: LicenseType.LO,
    agency: 'IBAMA',
    processNumber: '02001.007777/2020-62',
    issuedInDays: -1100,
    expiresInDays: 20, // ATTENTION
    conditions: [
      {
        itemNumber: '1',
        title: 'Monitoramento do efluente tratado',
        description:
          'Enviar mensalmente os resultados de DBO, DQO e sólidos suspensos do efluente lançado no corpo receptor.',
        responsibleName: 'Beatriz Ramos',
        esgMetric: 'Consumo de Água',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.MONTHLY,
        dueInDays: 7,
        alertInDays: 2,
      },
      {
        itemNumber: '2',
        title: 'Relatório de não conformidades',
        description:
          'Consolidar e protocolar o relatório de não conformidades ambientais do último ciclo.',
        responsibleName: 'Beatriz Ramos',
        esgMetric: 'Não Conformidades Ambientais',
        conditionType: ConditionType.INFORMATIVE,
        deadlineInDays: -20,
        completedInDays: -30, // FULFILLED
      },
    ],
  },
];

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function addDays(base: Date, days: number) {
  return new Date(base.getTime() + days * DAY_IN_MS);
}

/*
 * Mesma ideia do CreateLicenseUseCase: o status nunca é informado, é derivado
 * da data de validade.
 */
function deriveLicenseStatus(expirationDate: Date, now: Date): LicenseStatus {
  if (expirationDate.getTime() < now.getTime()) {
    return LicenseStatus.EXPIRED;
  }

  if (
    expirationDate.getTime() - now.getTime() <=
    LICENSE_ATTENTION_WINDOW_DAYS * DAY_IN_MS
  ) {
    return LicenseStatus.ATTENTION;
  }

  return LicenseStatus.REGULAR;
}

function deriveConditionStatus(
  condition: SeedCondition,
  now: Date,
): ConditionStatus {
  if (condition.completedInDays !== undefined) {
    return ConditionStatus.FULFILLED;
  }

  const referenceInDays = condition.dueInDays ?? condition.deadlineInDays;

  if (referenceInDays !== undefined && addDays(now, referenceInDays) < now) {
    return ConditionStatus.OVERDUE;
  }

  return ConditionStatus.IN_PROGRESS;
}

function optionalDate(base: Date, days?: number) {
  return days === undefined ? null : addDays(base, days);
}

async function seedUsersTable() {
  const passwordHash = await hash(SEED_PASSWORD);
  // login (parte local do e-mail) -> id, para vincular as empresas ao dono.
  const users = new Map<string, string>();

  for (const user of seedUsers) {
    const email = `${user.local}@${SEED_EMAIL_DOMAIN}`;

    const created = await prisma.user.upsert({
      where: { email },
      // Reaplica o hash para que um banco semeado por uma versão antiga (que
      // gravava hash literal) volte a ter contas com senha utilizável.
      update: { passwordHash, isAdmin: user.isAdmin, isActive: user.isActive },
      create: {
        name: user.name,
        email,
        passwordHash,
        isAdmin: user.isAdmin,
        isActive: user.isActive,
      },
    });

    users.set(user.local, created.id);
  }

  return users;
}

async function seedSectorsTable() {
  const sectors = new Map<string, string>();

  for (const sector of seedSectors) {
    const created = await prisma.sector.upsert({
      where: { name: sector.name },
      update: { description: sector.description },
      create: sector,
    });

    sectors.set(created.name, created.id);
  }

  return sectors;
}

async function seedIssuingAgenciesTable() {
  // sigla -> id, para vincular as licenças ao órgão emissor.
  const agencies = new Map<string, string>();

  for (const agency of seedIssuingAgencies) {
    const created = await prisma.issuingAgency.upsert({
      where: { name: agency.name },
      update: { acronym: agency.acronym },
      create: agency,
    });

    agencies.set(agency.acronym, created.id);
  }

  return agencies;
}

async function seedEsgMetricsTable() {
  const metrics = new Map<string, string>();

  for (const metric of seedEsgMetrics) {
    const existing = await prisma.esgMetric.findFirst({
      where: { customerId: null, name: metric.name },
    });

    const created =
      existing ??
      (await prisma.esgMetric.create({
        data: { ...metric, customerId: null },
      }));

    metrics.set(created.name, created.id);
  }

  return metrics;
}

async function seedCompaniesTable(
  users: Map<string, string>,
  sectors: Map<string, string>,
  metrics: Map<string, string>,
) {
  // nome da empresa -> id, para vincular as licenças.
  const companies = new Map<string, string>();

  for (const company of seedCompanies) {
    const ownerUserId = users.get(company.owner);

    if (!ownerUserId) {
      throw new Error(
        `Empresa "${company.name}" referencia a conta "${company.owner}", que não está em seedUsers.`,
      );
    }

    /*
     * A coluna `document` guarda só dígitos — é o que o CreateCustomerDto
     * grava (stripNonDigits) e é sobre esse formato que o índice único atua.
     * Semear mascarado faria a mesma empresa ser aceita de novo via
     * POST /customers, furando a regra de CNPJ duplicado da US01.
     */
    const document = company.document.replace(/\D/g, '');

    /*
     * A busca é por (dono, documento), que é o índice único de hoje: o mesmo
     * CNPJ pode existir em carteiras diferentes, então procurar só pelo
     * documento reencontraria a empresa de outra conta e pularia a criação.
     */
    const existing = await prisma.customer.findUnique({
      where: { ownerUserId_document: { ownerUserId, document } },
    });

    if (existing) {
      companies.set(company.name, existing.id);
      continue;
    }

    const address = await prisma.customerAddress.create({
      data: {
        ...company.address,
        // O enum só admite BILLING/SHIPPING; o "tipo de unidade" do domínio
        // (matriz, filial, planta) ainda não tem campo no schema.
        type: AddressType.BILLING,
        countryCode: 'BR',
      },
    });

    const created = await prisma.customer.create({
      data: {
        ownerUserId,
        name: company.name,
        document,
        documentType: DocumentType.CNPJ,
        email: company.email,
        ownerName: company.ownerName,
        ownerEmail: company.email,
        ownerPhone: company.ownerPhone,
        isActive: company.isActive,
        isDeleted: company.isDeleted ?? false,
        sectorId: sectors.get(company.sector),
        addressId: address.id,
      },
    });

    companies.set(company.name, created.id);

    // Vincula os indicadores ESG monitorados (join customer_esg_metrics), para
    // que GET /customers/:id/esg-metrics devolva dados já no primeiro boot.
    const links = company.metrics
      .map((name: string) => metrics.get(name))
      .filter((id): id is string => Boolean(id))
      .map((esgMetricId) => ({ customerId: created.id, esgMetricId }));

    if (links.length > 0) {
      await prisma.customerEsgMetric.createMany({ data: links });
    }

    companies.set(created.name, created.id);
  }

  return companies;
}

async function seedLicensesTable(
  companies: Map<string, string>,
  agencies: Map<string, string>,
  metrics: Map<string, string>,
) {
  const now = new Date();

  for (const license of seedLicenses) {
    const customerId = companies.get(license.company);

    if (!customerId) {
      throw new Error(
        `Licença "${license.processNumber}" referencia a empresa "${license.company}", que não está em seedCompanies.`,
      );
    }

    const issuingAgencyId = agencies.get(license.agency);

    if (!issuingAgencyId) {
      throw new Error(
        `Licença "${license.processNumber}" referencia o órgão "${license.agency}", que não está em seedIssuingAgencies.`,
      );
    }

    const issueDate = addDays(now, license.issuedInDays);
    const expirationDate = addDays(now, license.expiresInDays);

    const data = {
      issueDate,
      expirationDate,
      status: deriveLicenseStatus(expirationDate, now),
      documentUrl: `${SEED_DOCUMENT_BASE_URL}/licenca-${license.type.toLowerCase()}-${license.processNumber.replace(/\W/g, '')}.pdf`,
      issuingAgencyId,
    };

    /*
     * `License` não tem índice único; a identidade no seed é
     * (empresa, tipo, nº do processo). Numa reexecução as datas e o status
     * são reaplicados, para que os offsets relativos continuem coerentes com
     * o dia em que o seed rodou.
     */
    const existing = await prisma.license.findFirst({
      where: {
        customerId,
        type: license.type,
        processNumber: license.processNumber,
      },
    });

    const saved = existing
      ? await prisma.license.update({ where: { id: existing.id }, data })
      : await prisma.license.create({
          data: {
            ...data,
            type: license.type,
            processNumber: license.processNumber,
            customerId,
          },
        });

    const companyMetrics =
      seedCompanies.find((company) => company.name === license.company)
        ?.metrics ?? [];

    for (const condition of license.conditions) {
      const esgMetricId = metrics.get(condition.esgMetric);

      if (!esgMetricId || !companyMetrics.includes(condition.esgMetric)) {
        throw new Error(
          `Condicionante "${condition.itemNumber}" da licença "${license.processNumber}" referencia o parâmetro GRI "${condition.esgMetric}", que não está nos metrics de "${license.company}".`,
        );
      }

      const conditionData = {
        name: condition.title,
        description: condition.description,
        responsibleName: condition.responsibleName,
        conditionType: condition.conditionType,
        periodicity: condition.periodicity ?? null,
        deadline: optionalDate(now, condition.deadlineInDays),
        // due_date é obrigatório: é a data lida pelas regras de risco e
        // conformidade. Informativas usam o próprio prazo.
        dueDate: addDays(
          now,
          condition.dueInDays ?? condition.deadlineInDays ?? 0,
        ),
        alertDate: optionalDate(now, condition.alertInDays),
        completionDate: optionalDate(now, condition.completedInDays),
        conditionStatus: deriveConditionStatus(condition, now),
        esgMetricId,
      };

      await prisma.licenseCondition.upsert({
        where: {
          licenseId_itemNumber: {
            licenseId: saved.id,
            itemNumber: condition.itemNumber,
          },
        },
        update: conditionData,
        create: {
          ...conditionData,
          itemNumber: condition.itemNumber,
          licenseId: saved.id,
        },
      });
    }
  }
}

/*
 * Lido do banco, e não da lista acima: assim o resumo mostra o estado real
 * depois de uma reexecução do seed (idempotente) em vez de repetir a intenção.
 */
async function countCompaniesByOwner(users: Map<string, string>) {
  const counts = new Map<string, { visible: number; deleted: number }>();

  for (const [local, ownerUserId] of users) {
    const visible = await prisma.customer.count({
      where: { ownerUserId, isDeleted: false },
    });
    const deleted = await prisma.customer.count({
      where: { ownerUserId, isDeleted: true },
    });

    counts.set(local, { visible, deleted });
  }

  return counts;
}

async function countLicensesByStatus() {
  const grouped = await prisma.license.groupBy({
    by: ['status'],
    _count: { _all: true },
  });

  const byStatus = new Map(
    grouped.map((row) => [row.status, row._count._all] as const),
  );

  return {
    regular: byStatus.get(LicenseStatus.REGULAR) ?? 0,
    attention: byStatus.get(LicenseStatus.ATTENTION) ?? 0,
    expired: byStatus.get(LicenseStatus.EXPIRED) ?? 0,
    conditions: await prisma.licenseCondition.count(),
  };
}

async function main() {
  console.log('Iniciando o seed...');

  const users = await seedUsersTable();
  const sectors = await seedSectorsTable();
  const metrics = await seedEsgMetricsTable();
  const agencies = await seedIssuingAgenciesTable();
  const companies = await seedCompaniesTable(users, sectors, metrics);
  await seedLicensesTable(companies, agencies, metrics);

  const visible = seedCompanies.filter((company) => !company.isDeleted);
  const companiesByOwner = await countCompaniesByOwner(users);
  const licenses = await countLicensesByStatus();

  console.log('Seed completo executado com sucesso!');
  console.log('');
  console.log(`Usuários (senha para todos: ${SEED_PASSWORD}):`);
  for (const user of seedUsers) {
    const flags = [
      user.isAdmin ? 'admin' : null,
      user.isActive ? null : 'INATIVO',
    ]
      .filter(Boolean)
      .join(', ');

    // Cada conta só enxerga as próprias empresas (US03/US10): entrar com uma
    // ou com outra tem que devolver exatamente a carteira listada aqui.
    const owned = companiesByOwner.get(user.local) ?? {
      visible: 0,
      deleted: 0,
    };
    const portfolio = `${owned.visible} empresa(s) na carteira${
      owned.deleted > 0 ? ` + ${owned.deleted} excluída(s) logicamente` : ''
    }`;

    console.log(
      `  - ${user.local}@${SEED_EMAIL_DOMAIN}${flags ? ` (${flags})` : ''} — ${portfolio}`,
    );
  }
  console.log('');
  console.log(
    `Empresas: ${visible.length} visíveis (${
      visible.filter((company) => company.isActive).length
    } ativas, ${visible.filter((company) => !company.isActive).length} inativas) + ${
      seedCompanies.length - visible.length
    } excluída logicamente.`,
  );
  console.log(
    `Licenças: ${licenses.regular + licenses.attention + licenses.expired} (${licenses.regular} regulares, ${licenses.attention} em atenção, ${licenses.expired} vencidas) · Condicionantes: ${licenses.conditions}`,
  );
  console.log(
    `Segmentos: ${seedSectors.length} · Métricas ESG globais: ${seedEsgMetrics.length} · Órgãos emissores: ${seedIssuingAgencies.length}`,
  );
}

main()
  .catch((error) => {
    console.error('Falha ao executar o seed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
