import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma',
  datasource: {
    url: process.env['DATABASE_URL'] as string,
  },
  migrations: {
    seed: 'node_modules/.bin/tsx prisma/seed.ts',
  },
  migrate: {
    async adapter() {
      const { PrismaPg } = await import('@prisma/adapter-pg')
      return new PrismaPg({ connectionString: process.env['DATABASE_URL'] as string })
    },
  },
})
