import 'dotenv/config';
import { EsgPillar, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Iniciando o seed...');

  // 1. Users (3 registros)
  await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@esgplatform.com' },
      update: {},
      create: {
        name: 'Ana Administradora',
        email: 'admin@esgplatform.com',
        passwordHash: '$2b$10$hashedpasswordexample1',
        isAdmin: true,
        isActive: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'carlos.analista@esgplatform.com' },
      update: {},
      create: {
        name: 'Carlos Analista',
        email: 'carlos.analista@esgplatform.com',
        passwordHash: '$2b$10$hashedpasswordexample2',
        isAdmin: false,
        isActive: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'julia.auditora@esgplatform.com' },
      update: {},
      create: {
        name: 'Julia Auditora',
        email: 'julia.auditora@esgplatform.com',
        passwordHash: '$2b$10$hashedpasswordexample3',
        isAdmin: false,
        isActive: false,
      },
    }),
  ]);

  // 2. Sectors (3 registros)
  const sectors = await Promise.all([
    prisma.sector.upsert({
      where: { name: 'Agronegócio Sustentável' },
      update: {},
      create: {
        name: 'Agronegócio Sustentável',
        description:
          'Setor focado em produção agrícola com práticas ecológicas.',
      },
    }),
    prisma.sector.upsert({
      where: { name: 'Energia Renovável' },
      update: {},
      create: {
        name: 'Energia Renovável',
        description: 'Geração de energia solar, eólica e biomassa.',
      },
    }),
    prisma.sector.upsert({
      where: { name: 'Indústria Metalúrgica' },
      update: {},
      create: {
        name: 'Indústria Metalúrgica',
        description: 'Processamento e transformação de metais.',
      },
    }),
  ]);

  // 3. EsgMetrics (3 registros globais)
  const esgMetrics = [
    { name: 'Consumo de Água', unit: 'm³', pillar: EsgPillar.AMBIENTAL },
    {
      name: 'Emissão de CO2 Equivalente',
      unit: 'ton',
      pillar: EsgPillar.AMBIENTAL,
    },
    {
      name: 'Horas de Treinamento em Segurança',
      unit: 'horas',
      pillar: EsgPillar.SOCIAL,
    },
  ];

  for (const metric of esgMetrics) {
    await prisma.esgMetric.upsert({
      where: { name: metric.name },
      update: {},
      create: { ...metric, customerId: null },
    });
  }

  // 4. CustomerAddresses & Customers (3 registros interligados)
  const customerData = [
    {
      customer: {
        name: 'EcoVerde Agroindústria S.A.',
        document: '12.345.678/0001-99',
        documentType: 'CNPJ',
        email: 'contato@ecoverde.com',
        ownerName: 'Roberto Eco',
        ownerEmail: 'roberto@ecoverde.com',
        ownerPhone: '+55 51 99988-7766',
        isActive: true,
        sectorId: sectors[0].id,
      },
      address: {
        type: 'Matriz',
        street: 'Avenida das Palmeiras',
        number: '1000',
        city: 'Porto Alegre',
        state: 'Rio Grande do Sul',
        postalCode: '90000-000',
        countryCode: 'BR',
      },
    },
    {
      customer: {
        name: 'SolBrilho Energia Limpa',
        document: '98.765.432/0001-11',
        documentType: 'CNPJ',
        email: 'contato@solbrilho.com',
        ownerName: 'Mariana Luz',
        ownerEmail: 'mariana@solbrilho.com',
        ownerPhone: '+55 11 98877-6655',
        isActive: true,
        sectorId: sectors[1].id,
      },
      address: {
        type: 'Escritório Central',
        street: 'Rua do Sol',
        number: '450',
        city: 'São Paulo',
        state: 'São Paulo',
        postalCode: '01000-000',
        countryCode: 'BR',
      },
    },
    {
      customer: {
        name: 'MetalAço Brasil Ltda',
        document: '45.123.789/0001-55',
        documentType: 'CNPJ',
        email: 'contato@metalaco.com',
        ownerName: 'Carlos Aço',
        ownerEmail: 'carlos@metalaco.com',
        ownerPhone: '+55 31 97766-5544',
        isActive: true,
        sectorId: sectors[2].id,
      },
      address: {
        type: 'Planta Industrial',
        street: 'Rodovia dos Minérios',
        number: 'KM 12',
        city: 'Belo Horizonte',
        state: 'Minas Gerais',
        postalCode: '30000-000',
        countryCode: 'BR',
      },
    },
  ];

  for (const item of customerData) {
    // Cria ou atualiza o endereço primeiro
    const createdAddress = await prisma.customerAddress.create({
      data: item.address,
    });

    // Cria o cliente vinculando o endereço e o setor correspondente
    await prisma.customer.create({
      data: {
        ...item.customer,
        addressId: createdAddress.id,
      },
    });
  }

  console.log('Seed completo executado com sucesso!');
}

main()
  .catch((error) => {
    console.error('Falha ao executar o seed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
