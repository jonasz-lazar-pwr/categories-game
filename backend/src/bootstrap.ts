// === src/bootstrap.ts ===

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '#generated/prisma/client.js'
import { createHttpServer } from '#/bootstrap/http.js'
import { bootstrapIdentity } from '#/bootstrap/identity.js'
import { bootstrapGame } from '#/bootstrap/game.js'
import { bootstrapSocket } from '#/bootstrap/socket.js'

export async function bootstrap(): Promise<void> {
  const app = await createHttpServer()

  const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] as string })
  const prisma = new PrismaClient({ adapter })

  const { jwtService } = await bootstrapIdentity(app, prisma)
  const { gameRepository, startGameService, cancelGameService } = await bootstrapGame(
    app,
    prisma,
    jwtService,
  )
  await bootstrapSocket(app, gameRepository, startGameService, cancelGameService)

  const port = Number(process.env['PORT'] ?? 3000)
  await app.listen({ port, host: '0.0.0.0' })
}
