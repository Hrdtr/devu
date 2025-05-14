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

export const config = {
  port: argv.port || Bun.env.PORT || '3000',
  appResourcesPath: argv['app-resources-path'] || Bun.env.APP_RESOURCES_PATH,
  appDataDir: argv['app-data-dir'] || Bun.env.APP_DATA_DIR || join(process.cwd(), 'app_data'),
}
