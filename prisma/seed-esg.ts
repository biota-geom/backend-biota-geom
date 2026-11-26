import { EsgPillar, PrismaClient } from '@prisma/client';

export interface SeedEsgMetric {
  name: string;
  unit: string;
  pillar: EsgPillar;
}

export interface SeedGriStandard {
  code: string;
  name: string;
  pillar: EsgPillar;
  metric: string;
}

export interface SeedEsgMetricSeries {
  metric: string;
  source: string;
  // Ordered from oldest month to most recent month.
  values: number[];
  // Months behind the current UTC month for the last point (0 = current month).
  endMonthOffset?: number;
}

export const seedEsgMetrics: SeedEsgMetric[] = [
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
    name: 'Taxa de Reúso de Água',
    unit: '%',
    pillar: EsgPillar.AMBIENTAL,
  },
  {
    name: 'Efluentes Tratados',
    unit: 'm³',
    pillar: EsgPillar.AMBIENTAL,
  },
  {
    name: 'Emissões Indiretas de GEE (Escopo 2)',
    unit: 'ton',
    pillar: EsgPillar.AMBIENTAL,
  },
  {
    name: 'Taxa de Reciclagem de Resíduos',
    unit: '%',
    pillar: EsgPillar.AMBIENTAL,
  },
  {
    name: 'Participação de Energia Renovável',
    unit: '%',
    pillar: EsgPillar.AMBIENTAL,
  },
  {
    name: 'Horas de Treinamento em Segurança',
    unit: 'horas',
    pillar: EsgPillar.SOCIAL,
  },
  { name: 'Número de Funcionários', unit: 'pessoas', pillar: EsgPillar.SOCIAL },
  {
    name: 'Acidentes de Trabalho',
    unit: 'ocorrências',
    pillar: EsgPillar.SOCIAL,
  },
  {
    name: 'Liderança Feminina',
    unit: '%',
    pillar: EsgPillar.SOCIAL,
  },
  {
    name: 'Rotatividade de Funcionários',
    unit: '%',
    pillar: EsgPillar.SOCIAL,
  },
  {
    name: 'Não Conformidades Ambientais',
    unit: 'ocorrências',
    pillar: EsgPillar.GOVERNANCA,
  },
  {
    name: 'Fornecedores Avaliados em Critérios Ambientais',
    unit: '%',
    pillar: EsgPillar.GOVERNANCA,
  },
  {
    name: 'Auditorias Ambientais Realizadas',
    unit: 'auditorias',
    pillar: EsgPillar.GOVERNANCA,
  },
];

/*
 * Catálogo GRI. `metric` é a métrica global de `seedEsgMetrics` que passa a
 * apontar para o padrão (esg_metric.gri_standard_id).
 */
export const seedGriStandards: SeedGriStandard[] = [
  {
    code: 'GRI 303-5',
    name: 'Consumo de água',
    pillar: EsgPillar.AMBIENTAL,
    metric: 'Consumo de Água',
  },
  {
    code: 'GRI 305-1',
    name: 'Emissões diretas (Escopo 1) de gases de efeito estufa',
    pillar: EsgPillar.AMBIENTAL,
    metric: 'Emissão de CO2 Equivalente',
  },
  {
    code: 'GRI 306-3',
    name: 'Resíduos gerados',
    pillar: EsgPillar.AMBIENTAL,
    metric: 'Resíduos Sólidos Gerados',
  },
  {
    code: 'GRI 302-1',
    name: 'Consumo de energia dentro da organização',
    pillar: EsgPillar.AMBIENTAL,
    metric: 'Consumo de Energia',
  },
  {
    code: 'GRI 303-3',
    name: 'Captação e reúso de água',
    pillar: EsgPillar.AMBIENTAL,
    metric: 'Taxa de Reúso de Água',
  },
  {
    code: 'GRI 303-4',
    name: 'Descarte e tratamento de efluentes',
    pillar: EsgPillar.AMBIENTAL,
    metric: 'Efluentes Tratados',
  },
  {
    code: 'GRI 305-2',
    name: 'Emissões indiretas (Escopo 2) de gases de efeito estufa',
    pillar: EsgPillar.AMBIENTAL,
    metric: 'Emissões Indiretas de GEE (Escopo 2)',
  },
  {
    code: 'GRI 306-4',
    name: 'Resíduos não destinados para disposição final',
    pillar: EsgPillar.AMBIENTAL,
    metric: 'Taxa de Reciclagem de Resíduos',
  },
  {
    code: 'GRI 302-4',
    name: 'Redução do consumo de energia e uso de fontes renováveis',
    pillar: EsgPillar.AMBIENTAL,
    metric: 'Participação de Energia Renovável',
  },
  {
    code: 'GRI 403-5',
    name: 'Capacitação de trabalhadores em saúde e segurança do trabalho',
    pillar: EsgPillar.SOCIAL,
    metric: 'Horas de Treinamento em Segurança',
  },
  {
    code: 'GRI 2-7',
    name: 'Empregados',
    pillar: EsgPillar.SOCIAL,
    metric: 'Número de Funcionários',
  },
  {
    code: 'GRI 403-9',
    name: 'Acidentes de trabalho',
    pillar: EsgPillar.SOCIAL,
    metric: 'Acidentes de Trabalho',
  },
  {
    code: 'GRI 405-1',
    name: 'Diversidade de órgãos de governança e empregados',
    pillar: EsgPillar.SOCIAL,
    metric: 'Liderança Feminina',
  },
  {
    code: 'GRI 401-1',
    name: 'Novas contratações e rotatividade de empregados',
    pillar: EsgPillar.SOCIAL,
    metric: 'Rotatividade de Funcionários',
  },
  {
    code: 'GRI 2-27',
    name: 'Conformidade com leis e regulamentos',
    pillar: EsgPillar.GOVERNANCA,
    metric: 'Não Conformidades Ambientais',
  },
  {
    code: 'GRI 308-1',
    name: 'Novos fornecedores selecionados com base em critérios ambientais',
    pillar: EsgPillar.GOVERNANCA,
    metric: 'Fornecedores Avaliados em Critérios Ambientais',
  },
];

/*
 * Séries mensais realistas por empresa cobrindo os três pilares (Ambiental,
 * Social e Governança). A lista de métricas monitoradas de cada empresa
 * (`customer_esg_metrics`) é derivada diretamente daqui para garantir
 * consistência com `esg_indicator_record`.
 */
export const seedCompanyEsgSeries: Record<string, SeedEsgMetricSeries[]> = {
  'Unidade Industrial Ouro Preto': [
    {
      metric: 'Consumo de Água',
      source: 'Hidrômetro principal da planta',
      values: [14800, 14350, 14500, 13900, 13400, 12950],
    },
    {
      metric: 'Resíduos Sólidos Gerados',
      source: 'Relatório mensal PGRS',
      values: [420, 405, 415, 392, 380, 368],
    },
    {
      metric: 'Taxa de Reúso de Água',
      source: 'Balanço hídrico ETA industrial',
      values: [41.5, 43.0, 44.2, 46.0, 47.8, 49.5],
    },
    {
      metric: 'Horas de Treinamento em Segurança',
      source: 'Registro SESMT',
      values: [310, 340, 325, 360, 385, 410],
    },
    {
      metric: 'Acidentes de Trabalho',
      source: 'Relatório CAT / SESMT',
      values: [2, 1, 1, 0, 1, 0],
    },
    {
      metric: 'Não Conformidades Ambientais',
      source: 'Auditoria interna ISO 14001',
      values: [3, 2, 2, 1, 1, 1],
    },
  ],
  'Complexo Minerário Carajás': [
    {
      metric: 'Consumo de Água',
      source: 'Telemetria de captação superficial',
      values: [28500, 27900, 28100, 27400, 26800, 26100],
    },
    {
      metric: 'Emissão de CO2 Equivalente',
      source: 'Inventário GEE mensal (GHG Protocol)',
      values: [1850, 1810, 1790, 1740, 1695, 1640],
    },
    {
      metric: 'Taxa de Reciclagem de Resíduos',
      source: 'Manifestos de destinação final (MTR)',
      values: [52.0, 53.5, 55.0, 56.2, 58.0, 60.4],
    },
    {
      metric: 'Número de Funcionários',
      source: 'Folha de pagamento RH',
      values: [615, 620, 624, 630, 634, 640],
    },
    {
      metric: 'Horas de Treinamento em Segurança',
      source: 'Portal de capacitação operacional',
      values: [540, 560, 585, 600, 625, 650],
    },
    {
      metric: 'Auditorias Ambientais Realizadas',
      source: 'Comitê de Compliance Ambiental',
      values: [1, 1, 2, 1, 2, 2],
    },
  ],
  'EcoVerde Agroindústria S.A.': [
    {
      metric: 'Consumo de Água',
      source: 'Medidor de vazão industrial',
      values: [9600, 9400, 9150, 8900, 8750, 8420],
    },
    {
      metric: 'Participação de Energia Renovável',
      source: 'Fatura ACL + geração solar própria',
      values: [62.0, 64.5, 66.0, 68.2, 70.5, 73.0],
    },
    {
      metric: 'Efluentes Tratados',
      source: 'Laudo mensal ETE',
      values: [7200, 7350, 7400, 7550, 7680, 7820],
    },
    {
      metric: 'Número de Funcionários',
      source: 'Sistema RH',
      values: [285, 290, 294, 298, 302, 310],
    },
    {
      metric: 'Liderança Feminina',
      source: 'Censo interno de diversidade RH',
      values: [36.0, 36.5, 37.2, 38.0, 39.4, 41.0],
    },
    {
      metric: 'Fornecedores Avaliados em Critérios Ambientais',
      source: 'Homologação de suprimentos ESG',
      values: [74.0, 76.5, 79.0, 82.0, 85.5, 88.0],
    },
  ],
  'Fazenda Santa Clara - Unidade Sorriso': [
    {
      metric: 'Consumo de Água',
      source: 'Medidor de irrigação',
      values: [6400, 6550, 6300, 6700, 6950],
      endMonthOffset: 1,
    },
    {
      metric: 'Consumo de Energia',
      source: 'Fatura concessionária local',
      values: [48500, 49200, 47800, 50100, 51400],
      endMonthOffset: 1,
    },
    {
      metric: 'Rotatividade de Funcionários',
      source: 'Relatório mensal RH',
      values: [5.4, 5.8, 6.2, 6.5, 7.1],
      endMonthOffset: 1,
    },
    {
      metric: 'Não Conformidades Ambientais',
      source: 'Inspeção ambiental interna',
      values: [1, 2, 2, 3, 4],
      endMonthOffset: 1,
    },
  ],
  'MetalAço Brasil Ltda': [
    {
      metric: 'Emissão de CO2 Equivalente',
      source: 'Monitoramento contínuo de fornos',
      values: [3240, 3190, 3280, 3150, 3090, 3020],
    },
    {
      metric: 'Consumo de Energia',
      source: 'Subestação elétrica principal',
      values: [215000, 212400, 218000, 210500, 207800, 204200],
    },
    {
      metric: 'Emissões Indiretas de GEE (Escopo 2)',
      source: 'Fator de emissão SIN / MCTI',
      values: [640, 632, 650, 620, 608, 595],
    },
    {
      metric: 'Horas de Treinamento em Segurança',
      source: 'Controle SESMT',
      values: [420, 445, 430, 460, 480, 505],
    },
    {
      metric: 'Acidentes de Trabalho',
      source: 'Indicadores de segurança industrial',
      values: [3, 2, 2, 1, 2, 1],
    },
    {
      metric: 'Não Conformidades Ambientais',
      source: 'Relatório de gestão ambiental',
      values: [4, 3, 3, 2, 2, 2],
    },
  ],
  'Usina Siderúrgica Volta Redonda': [
    {
      metric: 'Emissão de CO2 Equivalente',
      source: 'Inventário operacional de chaminés',
      values: [4100, 4180, 4250, 4310, 4390],
      endMonthOffset: 1,
    },
    {
      metric: 'Resíduos Sólidos Gerados',
      source: 'Planilha de controle de escória',
      values: [580, 595, 610, 605, 628],
      endMonthOffset: 1,
    },
    {
      metric: 'Acidentes de Trabalho',
      source: 'Registro SESMT',
      values: [2, 3, 2, 3, 4],
      endMonthOffset: 1,
    },
    {
      metric: 'Não Conformidades Ambientais',
      source: 'Vistoria regulatória INEA',
      values: [3, 4, 4, 5, 5],
      endMonthOffset: 1,
    },
  ],
  'SolBrilho Energia Limpa': [
    {
      metric: 'Consumo de Energia',
      source: 'Medição inteligente da sede e O&M',
      values: [34200, 33800, 33100, 32600, 32100, 31400],
    },
    {
      metric: 'Participação de Energia Renovável',
      source: 'Certificados I-REC e autogeração',
      values: [88.0, 89.2, 90.5, 91.4, 92.8, 94.5],
    },
    {
      metric: 'Emissões Indiretas de GEE (Escopo 2)',
      source: 'Inventário GEE corporativo',
      values: [48.5, 46.2, 44.0, 41.8, 39.5, 36.2],
    },
    {
      metric: 'Número de Funcionários',
      source: 'Folha RH',
      values: [142, 146, 149, 152, 156, 160],
    },
    {
      metric: 'Liderança Feminina',
      source: 'Relatório de equidade RH',
      values: [42.0, 43.2, 44.0, 45.5, 46.8, 48.0],
    },
    {
      metric: 'Fornecedores Avaliados em Critérios Ambientais',
      source: 'Portal de compras sustentáveis',
      values: [81.0, 83.0, 85.5, 87.0, 89.2, 91.5],
    },
  ],
  'Parque Eólico Serra do Vento': [
    {
      metric: 'Consumo de Energia',
      source: 'Sistema SCADA do parque',
      values: [22400, 21900, 21500, 21200, 20800, 20300],
    },
    {
      metric: 'Participação de Energia Renovável',
      source: 'Balanço energético mensal',
      values: [91.0, 92.0, 93.4, 94.0, 95.2, 96.8],
    },
    {
      metric: 'Horas de Treinamento em Segurança',
      source: 'Treinamento NR-35 / SESMT',
      values: [180, 195, 210, 205, 220, 235],
    },
    {
      metric: 'Rotatividade de Funcionários',
      source: 'Indicadores de pessoas RH',
      values: [3.2, 2.9, 2.8, 2.5, 2.4, 2.1],
    },
    {
      metric: 'Auditorias Ambientais Realizadas',
      source: 'Relatório de conformidade IBAMA',
      values: [1, 1, 1, 2, 1, 2],
    },
  ],
  'Estação de Tratamento Vale Azul': [
    {
      metric: 'Consumo de Água',
      source: 'Consumo interno operacional ETA',
      values: [5400, 5320, 5280, 5190, 5120, 4980],
    },
    {
      metric: 'Efluentes Tratados',
      source: 'Medidor ultrassônico de saída ETE',
      values: [18400, 18900, 19200, 19650, 20100, 20650],
    },
    {
      metric: 'Taxa de Reúso de Água',
      source: 'Balanço operacional de água de reúso',
      values: [34.0, 35.8, 37.2, 39.0, 40.5, 42.4],
    },
    {
      metric: 'Horas de Treinamento em Segurança',
      source: 'Registro CIPA / SESMT',
      values: [210, 225, 240, 235, 255, 270],
    },
    {
      metric: 'Não Conformidades Ambientais',
      source: 'Monitoramento de parâmetros DBO/DQO',
      values: [4, 4, 3, 3, 2, 3],
    },
    {
      metric: 'Auditorias Ambientais Realizadas',
      source: 'Auditoria interna de saneamento',
      values: [1, 1, 2, 1, 1, 2],
    },
  ],
  'Celulose Rio Branco': [
    {
      metric: 'Consumo de Água',
      source: 'Medição de captação industrial',
      values: [19200, 18950, 18600, 18250, 17900, 17450],
    },
    {
      metric: 'Resíduos Sólidos Gerados',
      source: 'Controle de resíduos industriais',
      values: [310, 302, 296, 288, 280, 272],
    },
    {
      metric: 'Taxa de Reciclagem de Resíduos',
      source: 'Central de triagem e compostagem',
      values: [68.0, 69.5, 71.2, 73.0, 74.8, 76.5],
    },
    {
      metric: 'Número de Funcionários',
      source: 'Sistema corporativo RH',
      values: [510, 512, 518, 522, 526, 530],
    },
    {
      metric: 'Liderança Feminina',
      source: 'Relatório de diversidade corporativa',
      values: [34.0, 35.0, 35.8, 36.5, 37.4, 38.5],
    },
    {
      metric: 'Fornecedores Avaliados em Critérios Ambientais',
      source: 'Auditoria de cadeia florestal FSC',
      values: [78.0, 80.5, 82.0, 84.5, 87.0, 90.0],
    },
  ],
};

function utcMonthStart(base: Date, monthOffset: number): Date {
  return new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + monthOffset, 1),
  );
}

export async function seedEsgMetricsTable(prisma: PrismaClient) {
  const metrics = new Map<string, string>();

  for (const metric of seedEsgMetrics) {
    const existing = await prisma.esgMetric.findFirst({
      where: { customerId: null, name: metric.name },
    });

    const created = existing
      ? await prisma.esgMetric.update({
          where: { id: existing.id },
          data: { unit: metric.unit, pillar: metric.pillar },
        })
      : await prisma.esgMetric.create({
          data: { ...metric, customerId: null },
        });

    metrics.set(created.name, created.id);
  }

  return metrics;
}

export async function seedGriStandardsTable(
  prisma: PrismaClient,
  metrics: Map<string, string>,
) {
  for (const { metric, ...standard } of seedGriStandards) {
    const metricId = metrics.get(metric);

    if (!metricId) {
      throw new Error(
        `Padrão "${standard.code}" referencia a métrica "${metric}", que não está em seedEsgMetrics.`,
      );
    }

    const created = await prisma.griStandard.upsert({
      where: { code: standard.code },
      update: { name: standard.name, pillar: standard.pillar },
      create: standard,
    });

    await prisma.esgMetric.update({
      where: { id: metricId },
      data: { griStandardId: created.id },
    });
  }
}

export async function seedEsgIndicatorRecordsTable(
  prisma: PrismaClient,
  companies: Map<string, string>,
  metrics: Map<string, string>,
) {
  const now = new Date();
  let totalRecords = 0;

  for (const [companyName, seriesList] of Object.entries(
    seedCompanyEsgSeries,
  )) {
    const customerId = companies.get(companyName);

    if (!customerId) {
      throw new Error(
        `Série ESG referencia a empresa "${companyName}", que não está em seedCompanies.`,
      );
    }

    for (const series of seriesList) {
      const indicatorId = metrics.get(series.metric);

      if (!indicatorId) {
        throw new Error(
          `Série ESG da empresa "${companyName}" referencia a métrica "${series.metric}", que não está em seedEsgMetrics.`,
        );
      }

      const endOffset = series.endMonthOffset ?? 0;
      const count = series.values.length;

      for (let index = 0; index < count; index += 1) {
        const monthsAgo = endOffset + (count - 1 - index);
        const referenceMonth = utcMonthStart(now, -monthsAgo);
        const value = series.values[index];

        await prisma.esgIndicatorRecord.upsert({
          where: {
            customerId_indicatorId_referenceMonth: {
              customerId,
              indicatorId,
              referenceMonth,
            },
          },
          create: {
            customerId,
            indicatorId,
            referenceMonth,
            value,
            source: series.source,
          },
          update: {
            value,
            source: series.source,
          },
        });

        totalRecords += 1;
      }
    }
  }

  return totalRecords;
}
