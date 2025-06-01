import { join } from 'node:path'
import process from 'node:process'
import { parseArgs } from 'node:util'

const { values: argv } = parseArgs({
  args: Bun.argv,
  options: {
    'port': {
      type: 'string',
      short: 'p',
    },
    'app-resources-path': {
      type: 'string',
    },
    'app-data-dir': {
      type: 'string',
    },
  },
  strict: true,
  allowPositionals: true,
})

const port = argv.port || Bun.env.PORT || '3000'
const appResourcesPath = argv['app-resources-path'] || Bun.env.APP_RESOURCES_PATH
const appDataDir = argv['app-data-dir'] || Bun.env.APP_DATA_DIR || join(process.cwd(), 'app_data')

export const config = {
  port,
  appResourcesPath,
  appDataDir,

  dbFilePath: {
    app: join(appDataDir, 'app.db'),
    llmAgentsMemory: join(appDataDir, 'llm-agents-memory.db'),
    vector: join(appDataDir, 'vector.db'),
  },
}
