import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from '@node-rs/argon2';
import {
  AddressType,
  DocumentType,
  EsgPillar,
  PrismaClient,
} from '@prisma/client';

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
 * Carteira variada de propósito: segmentos e UFs repetidos em combinações
 * diferentes, unidades ativas e inativas, para exercitar a listagem (US03) e
 * a busca/filtros (US05) com resultados que de fato mudam conforme o filtro.
 * `state` usa a sigla da UF porque o card exibe "Cidade - Estado".
 */
const seedCompanies = [
  {
    name: 'Unidade Industrial Ouro Preto',
    document: '12.345.678/0001-95',
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

async function seedUsersTable() {
  const passwordHash = await hash(SEED_PASSWORD);

  for (const user of seedUsers) {
    const email = `${user.local}@${SEED_EMAIL_DOMAIN}`;

    await prisma.user.upsert({
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
  }
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
  sectors: Map<string, string>,
  metrics: Map<string, string>,
) {
  for (const company of seedCompanies) {
    /*
     * A coluna `document` guarda só dígitos — é o que o CreateCustomerDto
     * grava (stripNonDigits) e é sobre esse formato que o índice único atua.
     * Semear mascarado faria a mesma empresa ser aceita de novo via
     * POST /customers, furando a regra de CNPJ duplicado da US01.
     */
    const document = company.document.replace(/\D/g, '');

    const existing = await prisma.customer.findUnique({
      where: { document },
    });

    if (existing) {
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

    // Vincula os indicadores ESG monitorados (join customer_esg_metrics), para
    // que GET /customers/:id/esg-metrics devolva dados já no primeiro boot.
    const links = company.metrics
      .map((name: string) => metrics.get(name))
      .filter((id): id is string => Boolean(id))
      .map((esgMetricId) => ({ customerId: created.id, esgMetricId }));

    if (links.length > 0) {
      await prisma.customerEsgMetric.createMany({ data: links });
    }
  }
}

async function main() {
  console.log('Iniciando o seed...');

  await seedUsersTable();
  const sectors = await seedSectorsTable();
  const metrics = await seedEsgMetricsTable();
  await seedCompaniesTable(sectors, metrics);

  const visible = seedCompanies.filter((company) => !company.isDeleted);

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

    console.log(
      `  - ${user.local}@${SEED_EMAIL_DOMAIN}${flags ? ` (${flags})` : ''}`,
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
    `Segmentos: ${seedSectors.length} · Métricas ESG globais: ${seedEsgMetrics.length}`,
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
