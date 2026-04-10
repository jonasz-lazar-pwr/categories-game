// === src/Presentation/Identity/__tests__/logoutRoute.spec.ts ===

import { describe, it, expect } from 'vitest'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import { logoutRoute } from '#/Presentation/Identity/logoutRoute.js'

describe('logoutRoute', () => {
  const buildApp = (): ReturnType<typeof Fastify> => {
    const app = Fastify()
    void app.register(cookie)
    app.register(logoutRoute())
    return app
  }

  it('returns 204', async () => {
    const app = buildApp()
    const response = await app.inject({ method: 'POST', url: '/auth/logout' })
    expect(response.statusCode).toBe(204)
  })

  it('clears the refreshToken cookie', async () => {
    const app = buildApp()
    const response = await app.inject({ method: 'POST', url: '/auth/logout' })
    const setCookie = response.headers['set-cookie']
    expect(String(setCookie)).toContain('refreshToken=')
    expect(String(setCookie)).toMatch(/Max-Age=0|Expires=.*1970/i)
  })
})
