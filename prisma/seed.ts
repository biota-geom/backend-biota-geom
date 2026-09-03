import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { EsgPillar, PrismaClient } from '@prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const sectors = ['Siderurgia', 'Agronegócio', 'Mineração', 'Logística'];

const esgMetrics = [
  { name: 'Consumo de Água', unit: 'm³', pillar: EsgPillar.AMBIENTAL },
  { name: 'Resíduos Gerados', unit: 'ton', pillar: EsgPillar.AMBIENTAL },
  { name: 'Emissão de CO2', unit: 'ton', pillar: EsgPillar.AMBIENTAL },
  { name: 'Número de Funcionários', unit: 'pessoas', pillar: EsgPillar.SOCIAL },
];

async function main() {
  for (const name of sectors) {
    await prisma.sector.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  for (const metric of esgMetrics) {
    await prisma.esgMetric.upsert({
      where: { name: metric.name },
      update: {},
      create: { ...metric, customerId: null },
    });
  }
}

main()
  .then(() => console.log('Seed concluído com sucesso.'))
  .catch((error) => {
    console.error('Falha ao executar o seed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
