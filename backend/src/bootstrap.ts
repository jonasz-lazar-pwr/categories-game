// === src/bootstrap.ts ===

import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '#generated/prisma/client.js'
import '#/shared/types/FastifyTypes.js'

// === Identity — Infrastructure ===
import { UserPrismaRepository } from '#/Identity/Infrastructure/Prisma/UserPrismaRepository.js'
import { PasswordService } from '#/Identity/Infrastructure/PasswordService.js'
import { JwtService } from '#/Identity/Infrastructure/JwtService.js'
import { GetUserProfilePrismaQuery } from '#/Identity/Infrastructure/Prisma/GetUserProfilePrismaQuery.js'

// === Identity — Application ===
import { RegisterUserService } from '#/Identity/Application/RegisterUserService.js'
import { LoginUserService } from '#/Identity/Application/LoginUserService.js'
import { ChangeNickService } from '#/Identity/Application/ChangeNickService.js'

// === Identity — Presentation ===
import { registerRoute } from '#/Presentation/Identity/registerRoute.js'
import { loginRoute } from '#/Presentation/Identity/loginRoute.js'
import { refreshRoute } from '#/Presentation/Identity/refreshRoute.js'
import { getMeRoute } from '#/Presentation/Identity/getMeRoute.js'
import { changeNickRoute } from '#/Presentation/Identity/changeNickRoute.js'
import { logoutRoute } from '#/Presentation/Identity/logoutRoute.js'

export async function bootstrap(): Promise<void> {
  const app = Fastify({ logger: true })

  await app.register(cookie)

  const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] as string })
  const prisma = new PrismaClient({ adapter })

  // ===========================
  // Identity
  // ===========================

  const userRepository = new UserPrismaRepository(prisma)
  const passwordService = new PasswordService()
  const jwtService = new JwtService()
  const getUserProfileQuery = new GetUserProfilePrismaQuery(prisma)

  const registerUserService = new RegisterUserService(userRepository)
  const loginUserService = new LoginUserService(userRepository, passwordService)
  const changeNickService = new ChangeNickService(userRepository)

  await app.register(
    registerRoute(registerUserService, passwordService, jwtService, getUserProfileQuery),
  )
  await app.register(loginRoute(loginUserService, jwtService, getUserProfileQuery))
  await app.register(refreshRoute(jwtService))
  await app.register(getMeRoute(jwtService, getUserProfileQuery))
  await app.register(changeNickRoute(jwtService, changeNickService))
  await app.register(logoutRoute())

  // ===========================
  // Game
  // ===========================

  // ===========================
  // Round
  // ===========================

  // ===========================
  // Scoring
  // ===========================

  // ===========================
  // Socket.io
  // ===========================

  // ===========================
  // Start
  // ===========================

  const port = Number(process.env['PORT'] ?? 3000)
  const host = '0.0.0.0'

  await app.listen({ port, host })
}
