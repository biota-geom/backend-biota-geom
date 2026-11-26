import 'dotenv/config';
import { seedAlerts } from './seed-alerts';
import {
  seedCompanyEsgSeries,
  seedEsgIndicatorRecordsTable,
  seedEsgMetrics,
  seedEsgMetricsTable,
  seedGriStandards,
  seedGriStandardsTable,
} from './seed-esg';
import { calculateLicenseStatus } from '../src/modules/licenses/domain/license-status.calculator';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from '@node-rs/argon2';
import {
  AddressType,
  ConditionPeriodicity,
  ConditionStatus,
  ConditionType,
  DocumentType,
  LegislationImpact,
  LegislationType,
  LicenseLegislationSource,
  LicenseStatus,
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
 * Senha padrão para criação das contas de seed (sobrescrevível via env
 * `SEED_PASSWORD`). O hash é gerado com o mesmo Argon2id usado em runtime.
 * Em produção, reexecuções não sobrescrevem o hash de usuários existentes,
 * salvo se `SEED_RESET_PASSWORDS=true` for definido explicitamente.
 */
const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'Senha@1234';
const SHOULD_UPDATE_PASSWORD_ON_RESEED =
  process.env.NODE_ENV !== 'production' ||
  process.env.SEED_RESET_PASSWORDS === 'true';

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

const seedLegislations = [
  {
    type: LegislationType.LEI,
    number: '12.305',
    year: 2010,
    issuingBody: 'Governo Federal',
    summary: 'Institui a Política Nacional de Resíduos Sólidos.',
  },
  {
    type: LegislationType.RESOLUCAO,
    number: '237',
    year: 1997,
    issuingBody: 'CONAMA',
    summary:
      'Dispõe sobre os procedimentos e critérios do licenciamento ambiental.',
  },
  {
    type: LegislationType.LEI,
    number: '9.605',
    year: 1998,
    issuingBody: 'Governo Federal',
    summary:
      'Dispõe sobre as sanções penais e administrativas derivadas de condutas e atividades lesivas ao meio ambiente.',
  },
  {
    type: LegislationType.RESOLUCAO,
    number: '491',
    year: 2018,
    issuingBody: 'CONAMA',
    summary: 'Dispõe sobre os padrões de qualidade do ar.',
  },
  {
    type: LegislationType.LEI,
    number: '6.938',
    year: 1981,
    issuingBody: 'Governo Federal',
    summary: 'Dispõe sobre a Política Nacional do Meio Ambiente.',
  },
  {
    type: LegislationType.RESOLUCAO,
    number: '430',
    year: 2011,
    issuingBody: 'CONAMA',
    summary:
      'Dispõe sobre as condições e padrões de lançamento de efluentes em corpos de água receptores.',
  },
  {
    type: LegislationType.RESOLUCAO,
    number: '357',
    year: 2005,
    issuingBody: 'CONAMA',
    summary:
      'Dispõe sobre a classificação dos corpos de água e diretrizes ambientais para o seu enquadramento.',
  },
  {
    type: LegislationType.LEI,
    number: '12.651',
    year: 2012,
    issuingBody: 'Governo Federal',
    summary:
      'Dispõe sobre a proteção da vegetação nativa (Código Florestal Brasileiro).',
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
  title: string;
  description: string;
  responsibleName: string;
  environmentalDescriptor: string;
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
  type: string;
  agency: string; // texto livre gravado em licenses.issuing_agency
  processNumber: string;
  issuedInDays: number;
  expiresInDays: number;
  conditions: SeedCondition[];
  // Radar da licença: aponta para uma entrada de seedLegislations.
  legislations?: SeedLicenseLegislation[];
}

interface SeedLicenseLegislation {
  type: LegislationType;
  number: string;
  year: number;
  issuingBody: string;
  source: LicenseLegislationSource;
  citedExcerpt?: string;
  impact?: LegislationImpact;
  technicalAnalysis?: string;
  read?: boolean;
}

/*
 * Cobertura pensada para a listagem/filtros de licenças e barra de conformidade:
 * - regra de conformidade: condicionantes com vencimento > 30 dias (REGULAR)
 *   sobre o total ativo; 8..30 dias = ATTENTION; <= 7 dias = RISK.
 * - janela de atenção de licenças: 0..30 dias até o vencimento.
 * - distribuição de conformidade entre as empresas:
 *   admin: 100% (EcoVerde), 88% (Celulose Rio Branco), 83% (Carajás),
 *          67% (Ouro Preto), 50% (MetalAço), 25% (Fazenda Santa Clara),
 *          0% (Volta Redonda).
 *   carlos.analista: 100% (Serra do Vento), 80% (SolBrilho), 33% (Vale Azul).
 */
const seedLicenses: SeedLicense[] = [
  // --- Unidade Industrial Ouro Preto (3 licenças · 4/6 = 67%) ---
  {
    company: 'Unidade Industrial Ouro Preto',
    type: 'LO',
    agency: 'FEAM',
    processNumber: '2023.05.01.003.0001234',
    issuedInDays: -900,
    expiresInDays: 400, // REGULAR
    legislations: [
      {
        type: LegislationType.LEI,
        number: '12.305',
        year: 2010,
        issuingBody: 'Governo Federal',
        source: LicenseLegislationSource.SCAN,
        citedExcerpt:
          '…a destinação final dos resíduos deve observar a Lei nº 12.305/2010…',
        impact: LegislationImpact.HIGH,
      },
      {
        type: LegislationType.RESOLUCAO,
        number: '237',
        year: 1997,
        issuingBody: 'CONAMA',
        source: LicenseLegislationSource.SCAN,
        citedExcerpt:
          '…licença emitida nos termos da Resolução CONAMA nº 237/1997…',
        read: true,
      },
      {
        type: LegislationType.LEI,
        number: '9.605',
        year: 1998,
        issuingBody: 'Governo Federal',
        source: LicenseLegislationSource.MANUAL,
        impact: LegislationImpact.MODERATE,
        technicalAnalysis:
          'O descumprimento das condicionantes pode configurar infração administrativa e penal ambiental.',
      },
    ],
    conditions: [
      {
        title: 'Monitoramento da qualidade da água',
        description:
          'Realizar análise trimestral da qualidade da água superficial a montante e a jusante do empreendimento, com laudo de laboratório acreditado.',
        responsibleName: 'Roberto Andrade',
        environmentalDescriptor: 'Consumo de Água',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.QUARTERLY,
        dueInDays: 75, // REGULAR
        alertInDays: 45,
      },
      {
        title: 'Destinação de resíduos sólidos',
        description:
          'Apresentar semestralmente os manifestos de transporte e certificados de destinação final dos resíduos gerados.',
        responsibleName: 'Roberto Andrade',
        environmentalDescriptor: 'Resíduos Sólidos Gerados',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.SEMIANNUAL,
        dueInDays: 20, // ATTENTION
        alertInDays: 5,
      },
      {
        title: 'Apresentação do Plano de Controle Ambiental',
        description:
          'Protocolar o Plano de Controle Ambiental (PCA) atualizado junto ao órgão licenciador.',
        responsibleName: 'Roberto Andrade',
        environmentalDescriptor: 'Consumo de Água',
        conditionType: ConditionType.INFORMATIVE,
        deadlineInDays: 120, // REGULAR
        completedInDays: -15, // FULFILLED
      },
      {
        title: 'Controle de emissões particuladas',
        description:
          'Apresentar relatório semestral de monitoramento de material particulado nas vias internas de acesso.',
        responsibleName: 'Roberto Andrade',
        environmentalDescriptor: 'Emissão de CO2 Equivalente',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.SEMIANNUAL,
        dueInDays: 180, // REGULAR
        alertInDays: 150,
      },
    ],
  },
  {
    company: 'Unidade Industrial Ouro Preto',
    type: 'LI',
    agency: 'IBAMA',
    processNumber: '02001.004512/2019-31',
    issuedInDays: -1500,
    expiresInDays: -200, // EXPIRED
    conditions: [
      {
        title: 'Regularização de drenagem pluvial da expansão',
        description:
          'Protocolar relatório fotográfico e as-built do sistema de drenagem pluvial da área de expansão.',
        responsibleName: 'Roberto Andrade',
        environmentalDescriptor: 'Taxa de Reúso de Água',
        conditionType: ConditionType.INFORMATIVE,
        deadlineInDays: -10, // RISK / OVERDUE
        alertInDays: -25,
      },
    ],
  },
  {
    company: 'Unidade Industrial Ouro Preto',
    type: 'LP',
    agency: 'FEAM',
    processNumber: '2024.02.10.001.0002890',
    issuedInDays: -240,
    expiresInDays: 320, // REGULAR
    conditions: [
      {
        title: 'Estudo hidrogeológico complementar',
        description:
          'Entregar campanha anual de monitoramento piezométrico para a fase prévia do novo pátio.',
        responsibleName: 'Roberto Andrade',
        environmentalDescriptor: 'Consumo de Água',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.ANNUAL,
        dueInDays: 95, // REGULAR
        alertInDays: 65,
      },
    ],
  },

  // --- Complexo Minerário Carajás (3 licenças · 5/6 = 83%) ---
  {
    company: 'Complexo Minerário Carajás',
    type: 'LO',
    agency: 'IBAMA',
    processNumber: '02001.009876/2021-17',
    issuedInDays: -700,
    expiresInDays: 22, // ATTENTION
    legislations: [
      {
        type: LegislationType.RESOLUCAO,
        number: '237',
        year: 1997,
        issuingBody: 'CONAMA',
        source: LicenseLegislationSource.SCAN,
        citedExcerpt: '…conforme a Resolução CONAMA nº 237/1997…',
        impact: LegislationImpact.LOW,
      },
      {
        type: LegislationType.LEI,
        number: '12.651',
        year: 2012,
        issuingBody: 'Governo Federal',
        source: LicenseLegislationSource.MANUAL,
        impact: LegislationImpact.MODERATE,
        technicalAnalysis:
          'Exige manutenção integral da reserva legal e das áreas de preservação permanente no entorno da mina.',
      },
    ],
    conditions: [
      {
        title: 'Inventário de emissões atmosféricas',
        description:
          'Elaborar e enviar o inventário anual de emissões de gases de efeito estufa das operações.',
        responsibleName: 'Fernanda Lopes',
        environmentalDescriptor: 'Emissão de CO2 Equivalente',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.ANNUAL,
        dueInDays: 60, // REGULAR
        alertInDays: 30,
      },
      {
        title: 'Programa de educação ambiental',
        description:
          'Implementar o programa de educação ambiental junto às comunidades do entorno.',
        responsibleName: 'Fernanda Lopes',
        environmentalDescriptor: 'Horas de Treinamento em Segurança',
        conditionType: ConditionType.INFORMATIVE,
        deadlineInDays: 130, // REGULAR
      },
      {
        title: 'Monitoramento geotécnico de pilhas',
        description:
          'Enviar relatório trimestral de estabilidade e instrumentação das pilhas de estéril.',
        responsibleName: 'Fernanda Lopes',
        environmentalDescriptor: 'Auditorias Ambientais Realizadas',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.QUARTERLY,
        dueInDays: 18, // ATTENTION
        alertInDays: 5,
      },
    ],
  },
  {
    company: 'Complexo Minerário Carajás',
    type: 'LI',
    agency: 'IBAMA',
    processNumber: '02001.011204/2023-88',
    issuedInDays: -420,
    expiresInDays: 520, // REGULAR
    legislations: [
      {
        type: LegislationType.RESOLUCAO,
        number: '357',
        year: 2005,
        issuingBody: 'CONAMA',
        source: LicenseLegislationSource.SCAN,
        citedExcerpt:
          '…os corpos hídricos receptores deverão atender à Resolução CONAMA nº 357/2005…',
        impact: LegislationImpact.MODERATE,
      },
    ],
    conditions: [
      {
        title: 'Resgate e afugentamento de fauna',
        description:
          'Apresentar relatório semestral das campanhas de monitoramento e resgate de fauna na área de implantação.',
        responsibleName: 'Fernanda Lopes',
        environmentalDescriptor: 'Auditorias Ambientais Realizadas',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.SEMIANNUAL,
        dueInDays: 90, // REGULAR
        alertInDays: 60,
      },
      {
        title: 'Controle de sedimentos em bacias de contenção',
        description:
          'Protocolar análise trimestral de turbidez e sólidos suspensos nas bacias de contenção.',
        responsibleName: 'Fernanda Lopes',
        environmentalDescriptor: 'Consumo de Água',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.QUARTERLY,
        dueInDays: 150, // REGULAR
        alertInDays: 120,
      },
    ],
  },
  {
    company: 'Complexo Minerário Carajás',
    type: 'LP',
    agency: 'IBAMA',
    processNumber: '02001.008321/2024-12',
    issuedInDays: -180,
    expiresInDays: 640, // REGULAR
    conditions: [
      {
        title: 'Plano básico ambiental do novo ramal',
        description:
          'Submeter versão consolidada do PBA contemplando medidas mitigadoras para a fase de instalação.',
        responsibleName: 'Fernanda Lopes',
        environmentalDescriptor: 'Taxa de Reciclagem de Resíduos',
        conditionType: ConditionType.INFORMATIVE,
        deadlineInDays: 110, // REGULAR
      },
    ],
  },

  // --- EcoVerde Agroindústria S.A. (3 licenças · 5/5 = 100%) ---
  {
    company: 'EcoVerde Agroindústria S.A.',
    type: 'LO',
    agency: 'FEPAM',
    processNumber: '000123-05.67/23.4',
    issuedInDays: -365,
    expiresInDays: 700, // REGULAR
    legislations: [
      {
        type: LegislationType.RESOLUCAO,
        number: '491',
        year: 2018,
        issuingBody: 'CONAMA',
        source: LicenseLegislationSource.MANUAL,
        impact: LegislationImpact.MODERATE,
      },
      {
        type: LegislationType.LEI,
        number: '6.938',
        year: 1981,
        issuingBody: 'Governo Federal',
        source: LicenseLegislationSource.SCAN,
        citedExcerpt: '…Lei nº 6.938/1981, que institui a PNMA…',
        read: true,
      },
      {
        type: LegislationType.RESOLUCAO,
        number: '430',
        year: 2011,
        issuingBody: 'CONAMA',
        source: LicenseLegislationSource.SCAN,
        citedExcerpt:
          '…lançamento de efluentes tratados conforme limites da Resolução CONAMA nº 430/2011…',
        impact: LegislationImpact.HIGH,
      },
    ],
    conditions: [
      {
        title: 'Monitoramento de efluentes',
        description:
          'Enviar mensalmente o relatório de automonitoramento dos efluentes tratados, com os parâmetros da licença.',
        responsibleName: 'Mariana Souza',
        environmentalDescriptor: 'Efluentes Tratados',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.MONTHLY,
        dueInDays: 55, // REGULAR
        alertInDays: 25,
      },
      {
        title: 'Controle de consumo hídrico industrial',
        description:
          'Consolidar relatório trimestral de medição de vazão e metas de redução de consumo de água.',
        responsibleName: 'Mariana Souza',
        environmentalDescriptor: 'Consumo de Água',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.QUARTERLY,
        dueInDays: 90, // REGULAR
        alertInDays: 60,
        completedInDays: -15, // FULFILLED
      },
      {
        title: 'Gestão de resíduos orgânicos e compostagem',
        description:
          'Apresentar semestralmente o balanço de massa dos resíduos orgânicos enviados à compostagem.',
        responsibleName: 'Mariana Souza',
        environmentalDescriptor:
          'Fornecedores Avaliados em Critérios Ambientais',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.SEMIANNUAL,
        dueInDays: 140, // REGULAR
        alertInDays: 110,
      },
      {
        title: 'Relatório anual de recuperação de APP',
        description:
          'Comprovar a evolução do plantio de espécies nativas nas áreas de preservação permanente.',
        responsibleName: 'Mariana Souza',
        environmentalDescriptor: 'Participação de Energia Renovável',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.ANNUAL,
        dueInDays: 200, // REGULAR
        alertInDays: 170,
      },
    ],
  },
  {
    company: 'EcoVerde Agroindústria S.A.',
    type: 'LI',
    agency: 'FEPAM',
    processNumber: '000456-05.67/24.1',
    issuedInDays: -210,
    expiresInDays: 420, // REGULAR
    conditions: [
      {
        title: 'Instalação de biodigestor e controle de odores',
        description:
          'Apresentar laudo de comissionamento do novo biodigestor com verificação de eficiência.',
        responsibleName: 'Mariana Souza',
        environmentalDescriptor: 'Participação de Energia Renovável',
        conditionType: ConditionType.INFORMATIVE,
        deadlineInDays: 120, // REGULAR
      },
    ],
  },
  {
    company: 'EcoVerde Agroindústria S.A.',
    type: 'LP',
    agency: 'FEPAM',
    processNumber: '000987-05.67/18.2',
    issuedInDays: -1200,
    expiresInDays: -30, // EXPIRED
    conditions: [],
  },

  // --- Fazenda Santa Clara - Unidade Sorriso (2 licenças · 1/4 = 25%) ---
  {
    company: 'Fazenda Santa Clara - Unidade Sorriso',
    type: 'LO',
    agency: 'IBAMA',
    processNumber: '02001.003344/2020-19',
    issuedInDays: -1350,
    expiresInDays: -95, // EXPIRED
    legislations: [
      {
        type: LegislationType.LEI,
        number: '12.651',
        year: 2012,
        issuingBody: 'Governo Federal',
        source: LicenseLegislationSource.MANUAL,
        impact: LegislationImpact.HIGH,
        technicalAnalysis:
          'Necessária atualização do CAR e comprovação da recomposição de faixa marginal.',
      },
    ],
    conditions: [
      {
        title: 'Outorga de captação para irrigação',
        description:
          'Manter registro atualizado dos volumes captados nos pivôs centrais durante a safra.',
        responsibleName: 'Paulo Menezes',
        environmentalDescriptor: 'Consumo de Água',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.QUARTERLY,
        dueInDays: 80, // REGULAR
        alertInDays: 50,
      },
      {
        title: 'Devolução de embalagens de defensivos agrícolas',
        description:
          'Apresentar comprovantes de devolução das embalagens vazias em central credenciada.',
        responsibleName: 'Paulo Menezes',
        environmentalDescriptor: 'Não Conformidades Ambientais',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.SEMIANNUAL,
        dueInDays: -18, // RISK / OVERDUE
        alertInDays: -33,
      },
    ],
  },
  {
    company: 'Fazenda Santa Clara - Unidade Sorriso',
    type: 'LP',
    agency: 'IBAMA',
    processNumber: '02001.002211/2022-05',
    issuedInDays: -840,
    expiresInDays: 16, // ATTENTION
    conditions: [
      {
        title: 'Monitoramento de qualidade do solo',
        description:
          'Protocolar laudo laboratorial de monitoramento de nutrientes e resíduos no solo agrícola.',
        responsibleName: 'Paulo Menezes',
        environmentalDescriptor: 'Consumo de Água',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.ANNUAL,
        dueInDays: 22, // ATTENTION
        alertInDays: 7,
      },
      {
        title: 'Regularização de silo de armazenagem',
        description:
          'Enviar plano de controle de emissão de poeiras nos silos de grãos.',
        responsibleName: 'Paulo Menezes',
        environmentalDescriptor: 'Consumo de Energia',
        conditionType: ConditionType.INFORMATIVE,
        deadlineInDays: -6, // RISK / OVERDUE
        alertInDays: -20,
      },
    ],
  },

  // --- MetalAço Brasil Ltda (3 licenças · 3/6 = 50%) ---
  {
    company: 'MetalAço Brasil Ltda',
    type: 'LO',
    agency: 'FEAM',
    processNumber: '2022.03.01.002.0004567',
    issuedInDays: -1000,
    expiresInDays: 19, // ATTENTION
    legislations: [
      {
        type: LegislationType.RESOLUCAO,
        number: '491',
        year: 2018,
        issuingBody: 'CONAMA',
        source: LicenseLegislationSource.SCAN,
        citedExcerpt:
          '…os padrões de qualidade do ar obedecem à Resolução CONAMA nº 491/2018…',
        impact: LegislationImpact.HIGH,
      },
      {
        type: LegislationType.LEI,
        number: '12.305',
        year: 2010,
        issuingBody: 'Governo Federal',
        source: LicenseLegislationSource.MANUAL,
        impact: LegislationImpact.MODERATE,
      },
    ],
    conditions: [
      {
        title: 'Monitoramento de emissões de chaminé',
        description:
          'Realizar amostragem semestral das emissões das chaminés dos fornos e enviar o laudo ao órgão.',
        responsibleName: 'Carlos Aço',
        environmentalDescriptor: 'Emissão de CO2 Equivalente',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.SEMIANNUAL,
        dueInDays: 24, // ATTENTION
        alertInDays: 10,
      },
      {
        title: 'Monitoramento da qualidade do ar',
        description:
          'Manter estação de monitoramento da qualidade do ar e apresentar relatório trimestral.',
        responsibleName: 'Carlos Aço',
        environmentalDescriptor: 'Emissão de CO2 Equivalente',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.QUARTERLY,
        dueInDays: -5, // RISK / OVERDUE
        alertInDays: -20,
      },
      {
        title: 'Gerenciamento de escória siderúrgica',
        description:
          'Apresentar relatório semestral de reaproveitamento e destinação da escória de aciaria.',
        responsibleName: 'Carlos Aço',
        environmentalDescriptor: 'Não Conformidades Ambientais',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.SEMIANNUAL,
        dueInDays: 85, // REGULAR
        alertInDays: 55,
      },
    ],
  },
  {
    company: 'MetalAço Brasil Ltda',
    type: 'LI',
    agency: 'FEAM',
    processNumber: '2023.09.01.004.0008910',
    issuedInDays: -510,
    expiresInDays: 310, // REGULAR
    conditions: [
      {
        title: 'Controle de ruído na ampliação da laminação',
        description:
          'Apresentar laudo acústico trimestral nos limites da propriedade conforme NBR 10151.',
        responsibleName: 'Carlos Aço',
        environmentalDescriptor: 'Consumo de Energia',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.QUARTERLY,
        dueInDays: 105, // REGULAR
        alertInDays: 75,
      },
      {
        title: 'Inspeção de filtros de manga',
        description:
          'Protocolar relatório de manutenção preventiva e eficiência dos filtros de manga do alto-forno.',
        responsibleName: 'Carlos Aço',
        environmentalDescriptor: 'Emissões Indiretas de GEE (Escopo 2)',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.MONTHLY,
        dueInDays: 4, // RISK (imminent)
        alertInDays: -2,
      },
    ],
  },
  {
    company: 'MetalAço Brasil Ltda',
    type: 'LP',
    agency: 'IBAMA',
    processNumber: '02001.006120/2023-50',
    issuedInDays: -340,
    expiresInDays: 480, // REGULAR
    conditions: [
      {
        title: 'Plano de eficiência energética da nova linha',
        description:
          'Entregar estudo de redução de consumo específico de energia elétrica antes da emissão da LI.',
        responsibleName: 'Carlos Aço',
        environmentalDescriptor: 'Consumo de Energia',
        conditionType: ConditionType.INFORMATIVE,
        deadlineInDays: 160, // REGULAR
      },
    ],
  },

  // --- Usina Siderúrgica Volta Redonda (2 licenças · 0/3 = 0%) ---
  {
    company: 'Usina Siderúrgica Volta Redonda',
    type: 'LO',
    agency: 'INEA',
    processNumber: 'E-07/002.1234/2016',
    issuedInDays: -2000,
    expiresInDays: -120, // EXPIRED
    legislations: [
      {
        type: LegislationType.LEI,
        number: '9.605',
        year: 1998,
        issuingBody: 'Governo Federal',
        source: LicenseLegislationSource.MANUAL,
        impact: LegislationImpact.HIGH,
        technicalAnalysis:
          'Operação com licença vencida e condicionantes em atraso eleva risco de autuação imediata.',
      },
    ],
    conditions: [
      {
        title: 'Plano de remediação de solo contaminado',
        description:
          'Protocolar relatório semestral de monitoramento de águas subterrâneas na área de passivo.',
        responsibleName: 'Helena Martins',
        environmentalDescriptor: 'Não Conformidades Ambientais',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.SEMIANNUAL,
        dueInDays: -25, // RISK / OVERDUE
        alertInDays: -40,
      },
      {
        title: 'Inventário de emissões atmosféricas da fundição',
        description:
          'Enviar medições isocinéticas das chaminés principais referentes ao último ciclo.',
        responsibleName: 'Helena Martins',
        environmentalDescriptor: 'Emissão de CO2 Equivalente',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.ANNUAL,
        dueInDays: -8, // RISK / OVERDUE
        alertInDays: -23,
      },
    ],
  },
  {
    company: 'Usina Siderúrgica Volta Redonda',
    type: 'LI',
    agency: 'INEA',
    processNumber: 'E-07/005.6789/2021',
    issuedInDays: -1080,
    expiresInDays: 12, // ATTENTION
    conditions: [
      {
        title: 'Adequação da central de resíduos classe I',
        description:
          'Comprovar impermeabilização e contenção secundária do depósito de resíduos perigosos.',
        responsibleName: 'Helena Martins',
        environmentalDescriptor: 'Resíduos Sólidos Gerados',
        conditionType: ConditionType.INFORMATIVE,
        deadlineInDays: 15, // ATTENTION
        alertInDays: 3,
      },
    ],
  },

  // --- Celulose Rio Branco (3 licenças · 7/8 = 88%) ---
  {
    company: 'Celulose Rio Branco',
    type: 'LO',
    agency: 'IBAMA',
    processNumber: '02001.005555/2022-08',
    issuedInDays: -800,
    expiresInDays: 1000, // REGULAR
    legislations: [
      {
        type: LegislationType.RESOLUCAO,
        number: '430',
        year: 2011,
        issuingBody: 'CONAMA',
        source: LicenseLegislationSource.SCAN,
        citedExcerpt:
          '…os efluentes líquidos da fábrica de celulose devem atender à Resolução CONAMA nº 430/2011…',
        impact: LegislationImpact.HIGH,
        read: true,
      },
      {
        type: LegislationType.LEI,
        number: '12.305',
        year: 2010,
        issuingBody: 'Governo Federal',
        source: LicenseLegislationSource.SCAN,
        citedExcerpt:
          '…plano de gerenciamento de resíduos industriais nos termos da Lei nº 12.305/2010…',
        impact: LegislationImpact.MODERATE,
      },
    ],
    conditions: [
      {
        title: 'Monitoramento de efluentes da planta de branqueamento',
        description:
          'Enviar relatório trimestral de parâmetros físico-químicos e ecotoxicidade do efluente tratado.',
        responsibleName: 'Tiago Ferraz',
        environmentalDescriptor: 'Consumo de Água',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.QUARTERLY,
        dueInDays: 70, // REGULAR
        alertInDays: 40,
      },
      {
        title: 'Relatório de reaproveitamento de lodo fibroso',
        description:
          'Comprovar destinação de lodo fibroso para compostagem e geração de biomassa.',
        responsibleName: 'Tiago Ferraz',
        environmentalDescriptor: 'Taxa de Reciclagem de Resíduos',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.SEMIANNUAL,
        dueInDays: 115, // REGULAR
        alertInDays: 85,
      },
      {
        title: 'Auditoria de manejo florestal sustentável',
        description:
          'Protocolar resumo executivo da auditoria anual de conservação de corredores ecológicos.',
        responsibleName: 'Tiago Ferraz',
        environmentalDescriptor:
          'Fornecedores Avaliados em Critérios Ambientais',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.ANNUAL,
        dueInDays: 190, // REGULAR
        alertInDays: 160,
      },
      {
        title: 'Monitoramento de emissões odoríferas (TRS)',
        description:
          'Apresentar relatório mensal de compostos reduzidos de enxofre da caldeira de recuperação.',
        responsibleName: 'Tiago Ferraz',
        environmentalDescriptor: 'Resíduos Sólidos Gerados',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.MONTHLY,
        dueInDays: 21, // ATTENTION
        alertInDays: 7,
      },
    ],
  },
  {
    company: 'Celulose Rio Branco',
    type: 'LI',
    agency: 'IBAMA',
    processNumber: '02001.006612/2023-71',
    issuedInDays: -480,
    expiresInDays: 610, // REGULAR
    conditions: [
      {
        title: 'Controle de erosão nos talhões em implantação',
        description:
          'Apresentar relatório semestral de conservação de estradas florestais e controle de assoreamento.',
        responsibleName: 'Tiago Ferraz',
        environmentalDescriptor: 'Consumo de Água',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.SEMIANNUAL,
        dueInDays: 85, // REGULAR
        alertInDays: 55,
      },
      {
        title: 'Gerenciamento de resíduos da obra civil',
        description:
          'Enviar planilhas de controle e MTRs dos resíduos da ampliação do pátio de madeira.',
        responsibleName: 'Tiago Ferraz',
        environmentalDescriptor: 'Resíduos Sólidos Gerados',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.QUARTERLY,
        dueInDays: 135, // REGULAR
        alertInDays: 105,
      },
      {
        title: 'Programa de comunicação social com comunidades vizinhas',
        description:
          'Registrar atas de reuniões e ações de diálogo com lideranças locais do entorno.',
        responsibleName: 'Tiago Ferraz',
        environmentalDescriptor: 'Número de Funcionários',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.SEMIANNUAL,
        dueInDays: 210, // REGULAR
        alertInDays: 180,
      },
    ],
  },
  {
    company: 'Celulose Rio Branco',
    type: 'LP',
    agency: 'IBAMA',
    processNumber: '02001.007890/2024-22',
    issuedInDays: -150,
    expiresInDays: 820, // REGULAR
    conditions: [
      {
        title: 'Levantamento florístico da área de expansão',
        description:
          'Entregar inventário florestal detalhado e proposta de compensação ambiental.',
        responsibleName: 'Tiago Ferraz',
        environmentalDescriptor:
          'Fornecedores Avaliados em Critérios Ambientais',
        conditionType: ConditionType.INFORMATIVE,
        deadlineInDays: 100, // REGULAR
      },
    ],
  },

  // --- SolBrilho Energia Limpa (3 licenças · 4/5 = 80%) ---
  {
    company: 'SolBrilho Energia Limpa',
    type: 'LI',
    agency: 'CETESB',
    processNumber: '55/00123/22',
    issuedInDays: -300,
    expiresInDays: 500, // REGULAR
    legislations: [
      {
        type: LegislationType.RESOLUCAO,
        number: '237',
        year: 1997,
        issuingBody: 'CONAMA',
        source: LicenseLegislationSource.SCAN,
        citedExcerpt:
          '…licença de instalação emitida nos termos da Resolução CONAMA nº 237/1997…',
        impact: LegislationImpact.LOW,
        read: true,
      },
      {
        type: LegislationType.LEI,
        number: '12.305',
        year: 2010,
        issuingBody: 'Governo Federal',
        source: LicenseLegislationSource.MANUAL,
        impact: LegislationImpact.MODERATE,
        technicalAnalysis:
          'Prevê logística reversa para módulos fotovoltaicos e inversores ao fim da vida útil.',
      },
    ],
    conditions: [
      {
        title: 'Plano de logística reversa de módulos fotovoltaicos',
        description:
          'Manter atualizado o contrato de destinação e reciclagem de painéis avariados durante a montagem.',
        responsibleName: 'Mariana Luz',
        environmentalDescriptor:
          'Fornecedores Avaliados em Critérios Ambientais',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.ANNUAL,
        dueInDays: 65, // REGULAR
        alertInDays: 35,
      },
      {
        title: 'Controle de supressão e drenagem do terreno solar',
        description:
          'Apresentar relatório semestral de estabilidade do solo sob os trackers fotovoltaicos.',
        responsibleName: 'Mariana Luz',
        environmentalDescriptor: 'Participação de Energia Renovável',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.SEMIANNUAL,
        dueInDays: 125, // REGULAR
        alertInDays: 95,
      },
      {
        title: 'Capacitação ambiental das equipes de campo',
        description:
          'Protocolar lista de presença dos treinamentos de boas práticas ambientais em canteiro.',
        responsibleName: 'Mariana Luz',
        environmentalDescriptor: 'Número de Funcionários',
        conditionType: ConditionType.INFORMATIVE,
        deadlineInDays: 195, // REGULAR
      },
    ],
  },
  {
    company: 'SolBrilho Energia Limpa',
    type: 'LO',
    agency: 'CETESB',
    processNumber: '55/00489/24',
    issuedInDays: -140,
    expiresInDays: 780, // REGULAR
    conditions: [
      {
        title: 'Relatório de geração limpa e emissões evitadas',
        description:
          'Submeter balanço anual de energia limpa gerada e emissões de Escopo 2 evitadas.',
        responsibleName: 'Mariana Luz',
        environmentalDescriptor: 'Emissões Indiretas de GEE (Escopo 2)',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.ANNUAL,
        dueInDays: 110, // REGULAR
        alertInDays: 80,
      },
      {
        title: 'Inspeção de contenção de óleo dos transformadores',
        description:
          'Apresentar laudo semestral de estanqueidade das bacias de contenção da subestação.',
        responsibleName: 'Mariana Luz',
        environmentalDescriptor: 'Consumo de Energia',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.SEMIANNUAL,
        dueInDays: 19, // ATTENTION
        alertInDays: 5,
      },
    ],
  },
  {
    company: 'SolBrilho Energia Limpa',
    type: 'LP',
    agency: 'CETESB',
    processNumber: '55/00710/24',
    issuedInDays: -90,
    expiresInDays: 900, // REGULAR
    conditions: [],
  },

  // --- Parque Eólico Serra do Vento (2 licenças · 3/3 = 100%) ---
  {
    company: 'Parque Eólico Serra do Vento',
    type: 'LP',
    agency: 'IBAMA',
    processNumber: '02001.001111/2024-44',
    issuedInDays: -200,
    expiresInDays: 900, // REGULAR
    legislations: [
      {
        type: LegislationType.LEI,
        number: '6.938',
        year: 1981,
        issuingBody: 'Governo Federal',
        source: LicenseLegislationSource.SCAN,
        citedExcerpt: '…licenciamento ambiental conforme a Lei nº 6.938/1981…',
        impact: LegislationImpact.LOW,
        read: true,
      },
    ],
    conditions: [
      {
        title: 'Monitoramento de avifauna e quirópteros',
        description:
          'Enviar campanha semestral de monitoramento de rotas migratórias na área dos aerogeradores.',
        responsibleName: 'Ricardo Nunes',
        environmentalDescriptor: 'Auditorias Ambientais Realizadas',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.SEMIANNUAL,
        dueInDays: 95, // REGULAR
        alertInDays: 65,
      },
      {
        title: 'Estudo de ruído e sombreamento das torres',
        description:
          'Protocolar relatório anual de medição acústica nas residências do entorno do parque.',
        responsibleName: 'Ricardo Nunes',
        environmentalDescriptor: 'Participação de Energia Renovável',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.ANNUAL,
        dueInDays: 170, // REGULAR
        alertInDays: 140,
      },
    ],
  },
  {
    company: 'Parque Eólico Serra do Vento',
    type: 'LO',
    agency: 'IBAMA',
    processNumber: '02001.002945/2023-10',
    issuedInDays: -450,
    expiresInDays: 450, // REGULAR
    conditions: [
      {
        title: 'Recuperação de acessos e áreas degradadas',
        description:
          'Comprovar conclusão da revegetação das áreas de apoio utilizadas na montagem das turbinas.',
        responsibleName: 'Ricardo Nunes',
        environmentalDescriptor: 'Consumo de Energia',
        conditionType: ConditionType.INFORMATIVE,
        deadlineInDays: 130, // REGULAR
        completedInDays: -10, // FULFILLED
      },
    ],
  },

  // --- Estação de Tratamento Vale Azul (3 licenças · 2/6 = 33%) ---
  {
    company: 'Estação de Tratamento Vale Azul',
    type: 'LO',
    agency: 'IBAMA',
    processNumber: '02001.007777/2020-62',
    issuedInDays: -1100,
    expiresInDays: 20, // ATTENTION
    legislations: [
      {
        type: LegislationType.RESOLUCAO,
        number: '430',
        year: 2011,
        issuingBody: 'CONAMA',
        source: LicenseLegislationSource.SCAN,
        citedExcerpt:
          '…os parâmetros de DBO e DQO devem cumprir a Resolução CONAMA nº 430/2011…',
        impact: LegislationImpact.HIGH,
      },
      {
        type: LegislationType.RESOLUCAO,
        number: '357',
        year: 2005,
        issuingBody: 'CONAMA',
        source: LicenseLegislationSource.MANUAL,
        impact: LegislationImpact.MODERATE,
        technicalAnalysis:
          'Enquadramento Classe 2 do corpo receptor exige acompanhamento rigoroso de coliformes e oxigênio dissolvido.',
      },
    ],
    conditions: [
      {
        title: 'Monitoramento do efluente tratado',
        description:
          'Enviar mensalmente os resultados de DBO, DQO e sólidos suspensos do efluente lançado no corpo receptor.',
        responsibleName: 'Beatriz Ramos',
        environmentalDescriptor: 'Efluentes Tratados',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.MONTHLY,
        dueInDays: 5, // RISK
        alertInDays: 1,
      },
      {
        title: 'Relatório de não conformidades',
        description:
          'Consolidar e protocolar o relatório de não conformidades ambientais do último ciclo.',
        responsibleName: 'Beatriz Ramos',
        environmentalDescriptor: 'Não Conformidades Ambientais',
        conditionType: ConditionType.INFORMATIVE,
        deadlineInDays: 75, // REGULAR
        completedInDays: -10, // FULFILLED
      },
      {
        title: 'Análise de lodo de estação de tratamento',
        description:
          'Apresentar laudo trimestral de caracterização do lodo desidratado antes do envio ao aterro.',
        responsibleName: 'Beatriz Ramos',
        environmentalDescriptor: 'Taxa de Reúso de Água',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.QUARTERLY,
        dueInDays: 17, // ATTENTION
        alertInDays: 4,
      },
    ],
  },
  {
    company: 'Estação de Tratamento Vale Azul',
    type: 'LI',
    agency: 'IBAMA',
    processNumber: '02001.008432/2021-40',
    issuedInDays: -950,
    expiresInDays: -45, // EXPIRED
    conditions: [
      {
        title: 'Plano de contingência para extravasamento',
        description:
          'Manter atualizado o plano de ação emergencial das estações elevatórias de esgoto.',
        responsibleName: 'Beatriz Ramos',
        environmentalDescriptor: 'Auditorias Ambientais Realizadas',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.ANNUAL,
        dueInDays: 110, // REGULAR
        alertInDays: 80,
      },
      {
        title: 'Calibração de medidores de vazão da elevatória',
        description:
          'Protocolar certificados de calibração semestral dos medidores de entrada e saída.',
        responsibleName: 'Beatriz Ramos',
        environmentalDescriptor: 'Consumo de Água',
        conditionType: ConditionType.PERIODIC,
        periodicity: ConditionPeriodicity.SEMIANNUAL,
        dueInDays: -12, // RISK / OVERDUE
        alertInDays: -27,
      },
    ],
  },
  {
    company: 'Estação de Tratamento Vale Azul',
    type: 'LP',
    agency: 'IBAMA',
    processNumber: '02001.009102/2023-18',
    issuedInDays: -260,
    expiresInDays: 540, // REGULAR
    conditions: [
      {
        title: 'Estudo de autodepuração do corpo receptor',
        description:
          'Entregar modelagem de dispersão e capacidade de suporte do córrego receptor para ampliação da ETE.',
        responsibleName: 'Beatriz Ramos',
        environmentalDescriptor: 'Efluentes Tratados',
        conditionType: ConditionType.INFORMATIVE,
        deadlineInDays: -4, // RISK / OVERDUE
        alertInDays: -18,
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
  return calculateLicenseStatus(expirationDate, now);
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
      update: {
        ...(SHOULD_UPDATE_PASSWORD_ON_RESEED ? { passwordHash } : {}),
        isAdmin: user.isAdmin,
        isActive: user.isActive,
      },
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

async function seedLegislationsTable() {
  for (const legislation of seedLegislations) {
    const { type, number, year, issuingBody } = legislation;

    await prisma.legislation.upsert({
      where: {
        type_number_year_issuingBody: { type, number, year, issuingBody },
      },
      create: legislation,
      update: legislation,
    });
  }
}

async function seedCompaniesTable(
  users: Map<string, string>,
  sectors: Map<string, string>,
  metrics: Map<string, string>,
) {
  // nome da empresa -> id, para vincular licenças e indicadores ESG.
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

    let customerId: string;

    if (existing) {
      customerId = existing.id;
    } else {
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

      customerId = created.id;
    }

    companies.set(company.name, customerId);

    // Vincula os indicadores ESG monitorados (join customer_esg_metrics) de
    // forma idempotente mesmo quando a empresa já existia no banco.
    const metricNames = (seedCompanyEsgSeries[company.name] ?? []).map(
      (entry) => entry.metric,
    );
    const links = metricNames
      .map((name) => metrics.get(name))
      .filter((id): id is string => Boolean(id))
      .map((esgMetricId) => ({ customerId, esgMetricId }));

    if (links.length > 0) {
      await prisma.customerEsgMetric.createMany({
        data: links,
        skipDuplicates: true,
      });
    }
  }

  return companies;
}

async function seedLicensesTable(companies: Map<string, string>) {
  const now = new Date();
  const licenseIds: string[] = [];

  for (const license of seedLicenses) {
    const customerId = companies.get(license.company);

    if (!customerId) {
      throw new Error(
        `Licença "${license.processNumber}" referencia a empresa "${license.company}", que não está em seedCompanies.`,
      );
    }

    const issueDate = addDays(now, license.issuedInDays);
    const expirationDate = addDays(now, license.expiresInDays);

    const data = {
      issueDate,
      expirationDate,
      status: deriveLicenseStatus(expirationDate, now),
      documentUrl: `${SEED_DOCUMENT_BASE_URL}/licenca-${license.type.toLowerCase()}-${license.processNumber.replace(/\W/g, '')}.pdf`,
      issuingAgency: license.agency,
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

    licenseIds.push(saved.id);
    for (const entry of license.legislations ?? []) {
      const legislation = await prisma.legislation.findUnique({
        where: {
          type_number_year_issuingBody: {
            type: entry.type,
            number: entry.number,
            year: entry.year,
            issuingBody: entry.issuingBody,
          },
        },
      });

      if (!legislation) {
        throw new Error(
          `Licença "${license.processNumber}" referencia a legislação ${entry.type} ${entry.number}/${entry.year} (${entry.issuingBody}), que não está em seedLegislations.`,
        );
      }

      const link = {
        source: entry.source,
        citedExcerpt: entry.citedExcerpt ?? null,
        impact: entry.impact ?? null,
        technicalAnalysis: entry.technicalAnalysis ?? null,
        readAt: entry.read ? now : null,
      };

      await prisma.licenseLegislation.upsert({
        where: {
          licenseId_legislationId: {
            licenseId: saved.id,
            legislationId: legislation.id,
          },
        },
        create: { ...link, licenseId: saved.id, legislationId: legislation.id },
        update: link,
      });
    }

    for (const [index, condition] of license.conditions.entries()) {
      const conditionData = {
        name: condition.title,
        // Ordem da numeração na página: a mesma da lista acima.
        position: index + 1,
        environmentalDescriptor: condition.environmentalDescriptor,
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
      };

      const existingCondition = await prisma.licenseCondition.findFirst({
        where: { licenseId: saved.id, name: condition.title },
      });

      if (existingCondition) {
        await prisma.licenseCondition.update({
          where: { id: existingCondition.id },
          data: conditionData,
        });
      } else {
        await prisma.licenseCondition.create({
          data: { ...conditionData, licenseId: saved.id },
        });
      }
    }
  }
  await seedAlerts(prisma, licenseIds);
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
  const metrics = await seedEsgMetricsTable(prisma);
  await seedGriStandardsTable(prisma, metrics);
  await seedLegislationsTable();
  await seedIssuingAgenciesTable();
  const companies = await seedCompaniesTable(users, sectors, metrics);
  const esgRecords = await seedEsgIndicatorRecordsTable(
    prisma,
    companies,
    metrics,
  );
  await seedLicensesTable(companies);

  const visible = seedCompanies.filter((company) => !company.isDeleted);
  const companiesByOwner = await countCompaniesByOwner(users);
  const licenses = await countLicensesByStatus();

  const passwordNote =
    process.env.NODE_ENV === 'production' || process.env.SEED_PASSWORD
      ? 'senha definida via SEED_PASSWORD'
      : `senha padrão na criação: ${SEED_PASSWORD}`;

  console.log('Seed completo executado com sucesso!');
  console.log('');
  console.log(`Usuários (${passwordNote}):`);
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
    `Segmentos: ${seedSectors.length} · Métricas ESG globais: ${seedEsgMetrics.length} · Registros mensais ESG: ${esgRecords} · Órgãos emissores: ${seedIssuingAgencies.length}`,
  );
  console.log(
    `Padrões GRI: ${seedGriStandards.length} · Legislações: ${seedLegislations.length} · Vínculos no radar: ${seedLicenses.reduce((total, license) => total + (license.legislations?.length ?? 0), 0)}`,
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
