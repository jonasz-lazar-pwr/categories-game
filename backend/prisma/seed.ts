// === prisma/seed.ts ===

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.js'

const DEFAULT_CATEGORIES: { id: string; name: string; description: string }[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Państwo',
    description: 'Suwerenne państwo lub kraj na świecie',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Miasto',
    description: 'Miasto lub miejscowość w Polsce lub na świecie',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'Rzeka',
    description: 'Rzeka lub strumień w Polsce lub na świecie',
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    name: 'Góra',
    description: 'Góra lub pasmo górskie w Polsce lub na świecie',
  },
  {
    id: '00000000-0000-0000-0000-000000000005',
    name: 'Roślina',
    description: 'Roślina, drzewo lub kwiat',
  },
  {
    id: '00000000-0000-0000-0000-000000000006',
    name: 'Zwierzę',
    description: 'Zwierzę dzikie lub domowe',
  },
  {
    id: '00000000-0000-0000-0000-000000000007',
    name: 'Imię',
    description: 'Imię żeńskie lub męskie',
  },
  {
    id: '00000000-0000-0000-0000-000000000008',
    name: 'Nazwisko',
    description: 'Nazwisko polskie lub zagraniczne',
  },
  {
    id: '00000000-0000-0000-0000-000000000009',
    name: 'Jedzenie',
    description: 'Potrawa, danie lub produkt spożywczy',
  },
  {
    id: '00000000-0000-0000-0000-000000000010',
    name: 'Zawód',
    description: 'Zawód lub profesja wykonywana przez człowieka',
  },
  {
    id: '00000000-0000-0000-0000-000000000011',
    name: 'Marka',
    description: 'Marka, firma lub znana korporacja',
  },
  {
    id: '00000000-0000-0000-0000-000000000012',
    name: 'Film',
    description: 'Tytuł filmu polskiego lub zagranicznego',
  },
]

const databaseUrl = process.env['DATABASE_URL']
if (!databaseUrl) throw new Error('DATABASE_URL is not set.')

const adapter = new PrismaPg({ connectionString: databaseUrl })
const prisma = new PrismaClient({ adapter })

async function seed(): Promise<void> {
  for (const category of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { id: category.id },
      create: {
        id: category.id,
        name: category.name,
        description: category.description,
        isDefault: true,
      },
      update: { name: category.name, description: category.description, isDefault: true },
    })
  }
  console.log(`Zasiano ${DEFAULT_CATEGORIES.length} domyślnych kategorii.`)
}

await seed()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
