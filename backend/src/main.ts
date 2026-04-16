// === src/main.ts ===

import { bootstrap } from '#/bootstrap.js'

const { shutdown } = await bootstrap()

const handleSignal = (): void => {
  void shutdown().finally(() => process.exit(0))
}

process.on('SIGTERM', handleSignal)
process.on('SIGINT', handleSignal)
