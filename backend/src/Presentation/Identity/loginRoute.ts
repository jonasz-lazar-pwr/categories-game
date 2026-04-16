// === src/Presentation/Identity/loginRoute.ts ===

import { z } from 'zod'
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'
import { LoginUserCommand } from '#/Identity/Application/CommandDto/LoginUserCommand.js'
import type { FastifyInstance } from 'fastify'
import type { LoginUserService } from '#/Identity/Application/LoginUserService.js'
import type { IJwtService } from '#/Identity/Domain/IJwtService.js'
import type { IGetUserProfileQuery } from '#/Identity/Application/GetUserProfileQuery.js'
import { REFRESH_TOKEN_MAX_AGE_SECONDS } from '#/shared/constants/authConstants.js'

const bodySchema = z.object({
  email: z.string(),
  password: z.string(),
})

export function loginRoute(
  loginUserService: LoginUserService,
  jwtService: IJwtService,
  getUserProfileQuery: IGetUserProfileQuery,
) {
  return function (fastify: FastifyInstance): void {
    fastify.post(
      '/auth/login',
      { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
      async (request, reply) => {
        const parsed = bodySchema.safeParse(request.body)
        if (!parsed.success) {
          return reply
            .status(400)
            .send({ error: parsed.error.issues[0]?.message ?? 'Invalid input.' })
        }

        let userId: string
        try {
          const result = await loginUserService.execute(
            new LoginUserCommand(parsed.data.email, parsed.data.password),
          )
          userId = result.userId
        } catch (error) {
          if (error instanceof InvalidArgumentError) {
            return reply.status(401).send({ error: error.message })
          }
          throw error
        }

        const accessToken = jwtService.signAccess(userId)
        const refreshToken = jwtService.signRefresh(userId)

        void reply.setCookie('refreshToken', refreshToken, {
          httpOnly: true,
          secure: process.env['NODE_ENV'] === 'production',
          sameSite: 'strict',
          path: '/auth',
          maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
        })

        const user = await getUserProfileQuery.execute(userId)
        if (user === null) {
          return reply.status(500).send({ error: 'Internal server error.' })
        }

        return reply.status(200).send({ accessToken, user })
      },
    )
  }
}
