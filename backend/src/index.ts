import { buildApp } from './app.js'

async function main() {
  const app = await buildApp()

  const port = Number(process.env['PORT'] ?? 3001)
  const host = process.env['HOST'] ?? '0.0.0.0'

  try {
    await app.listen({ port, host })
    app.log.info(`Server running at http://${host}:${port}`)
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }
}

main()
