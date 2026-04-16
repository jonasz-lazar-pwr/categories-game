// === src/bootstrap/identity.ts ===

import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '#generated/prisma/client.js'
import type { IJwtService } from '#/Identity/Domain/IJwtService.js'
import { UserPrismaRepository } from '#/Identity/Infrastructure/Prisma/UserPrismaRepository.js'
import { PasswordService } from '#/Identity/Infrastructure/PasswordService.js'
import { JwtService } from '#/Identity/Infrastructure/JwtService.js'
import { GetUserProfilePrismaQuery } from '#/Identity/Infrastructure/Prisma/GetUserProfilePrismaQuery.js'
import { RegisterUserService } from '#/Identity/Application/RegisterUserService.js'
import { LoginUserService } from '#/Identity/Application/LoginUserService.js'
import { ChangeNickService } from '#/Identity/Application/ChangeNickService.js'
import { registerRoute } from '#/Presentation/Identity/registerRoute.js'
import { loginRoute } from '#/Presentation/Identity/loginRoute.js'
import { refreshRoute } from '#/Presentation/Identity/refreshRoute.js'
import { getMeRoute } from '#/Presentation/Identity/getMeRoute.js'
import { changeNickRoute } from '#/Presentation/Identity/changeNickRoute.js'
import { logoutRoute } from '#/Presentation/Identity/logoutRoute.js'

export interface IIdentityBootstrapResult {
  jwtService: IJwtService
}

export async function bootstrapIdentity(
  app: FastifyInstance,
  prisma: PrismaClient,
): Promise<IIdentityBootstrapResult> {
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

  return { jwtService }
}
