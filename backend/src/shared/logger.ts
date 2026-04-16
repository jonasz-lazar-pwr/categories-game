// === src/shared/logger.ts ===

import pino from 'pino'

export function createLoggerOptions(): pino.LoggerOptions {
  const isProd = process.env['NODE_ENV'] === 'prod'

  if (isProd) {
    return { level: 'info' }
  }

  return {
    level: 'debug',
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
  }
}

export function createLogger(): pino.Logger {
  return pino(createLoggerOptions())
}
