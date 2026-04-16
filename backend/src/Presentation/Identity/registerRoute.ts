// === src/Presentation/Identity/registerRoute.ts ===

import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'
import { ConflictError } from '#/shared/errors/ConflictError.js'
import { RegisterUserCommand } from '#/Identity/Application/CommandDto/RegisterUserCommand.js'
import type { FastifyInstance } from 'fastify'
import type { RegisterUserService } from '#/Identity/Application/RegisterUserService.js'
import type { IPasswordHasher } from '#/Identity/Application/IPasswordHasher.js'
import type { IJwtService } from '#/Identity/Domain/IJwtService.js'
import type { IGetUserProfileQuery } from '#/Identity/Application/GetUserProfileQuery.js'
import { REFRESH_TOKEN_MAX_AGE_SECONDS } from '#/shared/constants/authConstants.js'

const bodySchema = z.object({
  email: z.string(),
  nick: z.string(),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
})

export function registerRoute(
  registerUserService: RegisterUserService,
  passwordService: IPasswordHasher,
  jwtService: IJwtService,
  getUserProfileQuery: IGetUserProfileQuery,
) {
  return function (fastify: FastifyInstance): void {
    fastify.post(
      '/auth/register',
      { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
      async (request, reply) => {
        const parsed = bodySchema.safeParse(request.body)
        if (!parsed.success) {
          return reply
            .status(400)
            .send({ error: parsed.error.issues[0]?.message ?? 'Invalid input.' })
        }

        const { email, nick, password } = parsed.data
        const passwordHash = await passwordService.hash(password)
        const id = randomUUID()

        try {
          await registerUserService.execute(new RegisterUserCommand(id, email, nick, passwordHash))
        } catch (error) {
          if (error instanceof ConflictError) {
            return reply.status(409).send({ error: error.message })
          }
          if (error instanceof InvalidArgumentError) {
            return reply.status(400).send({ error: error.message })
          }
          throw error
        }

        const accessToken = jwtService.signAccess(id)
        const refreshToken = jwtService.signRefresh(id)

        void reply.setCookie('refreshToken', refreshToken, {
          httpOnly: true,
          secure: process.env['NODE_ENV'] === 'production',
          sameSite: 'strict',
          path: '/auth',
          maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
        })

        const user = await getUserProfileQuery.execute(id)
        if (user === null) {
          return reply.status(500).send({ error: 'Internal server error.' })
        }

        return reply.status(201).send({ accessToken, user })
      },
    )
  }
}
