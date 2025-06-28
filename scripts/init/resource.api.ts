import { cpSync, mkdirSync, rmdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { parseArgs } from 'node:util'
import { $ } from 'bun'

const { values: _argv } = parseArgs({
  args: Bun.argv,
  options: {},
  strict: true,
  allowPositionals: true,
})

const SOURCE_DIR = resolve(join(process.cwd(), 'apps', 'devu-api'))
const OUTPUT_DIR = resolve(join(process.cwd(), 'apps', 'devu', 'tauri', 'resources', 'api'))
const DEBUG_API_RESOURCES_DIR = resolve(join(process.cwd(), 'apps', 'devu', 'tauri', 'target', 'debug', 'resources', 'api'))

// Clean up old build
try {
  rmdirSync(OUTPUT_DIR, { recursive: true })
  rmdirSync(DEBUG_API_RESOURCES_DIR, { recursive: true })
}
catch (error) {
  if ((error as ErrnoException)?.code !== 'ENOENT') {
    throw error
  }
}

mkdirIfNotExists(OUTPUT_DIR)
mkdirIfNotExists(DEBUG_API_RESOURCES_DIR)

const lockFileContent = await Bun.file(join(process.cwd(), 'bun.lock')).text()
const EXTERNAL_DEPS = {
  libsql: lockFileContent.split('\n').find(line => line.includes('"libsql@'))?.match(/libsql@([^"]+)"/)?.[1],
  pyodide: lockFileContent.split('\n').find(line => line.includes('"pyodide@'))?.match(/pyodide@([^"]+)"/)?.[1],
}
await Bun.build({
  entrypoints: [join(SOURCE_DIR, 'index.ts')],
  target: 'bun',
  external: Object.keys(EXTERNAL_DEPS),
  outdir: OUTPUT_DIR,
  minify: false,
  sourcemap: 'linked',
})

mkdirIfNotExists(join(OUTPUT_DIR, 'database', 'migrations'))
cpSync(join(SOURCE_DIR, 'database', 'migrations'), join(OUTPUT_DIR, 'database', 'migrations'), { recursive: true })

mkdirIfNotExists(join(OUTPUT_DIR, 'static'))
cpSync(join(SOURCE_DIR, 'static'), join(OUTPUT_DIR, 'static'), { recursive: true })

// Install external dependencies
Bun.write(Bun.file(join(OUTPUT_DIR, 'package.json')), JSON.stringify({ dependencies: EXTERNAL_DEPS }))
await $`bun install`.cwd(OUTPUT_DIR)
try {
  await $`bun pm trust --all`.cwd(OUTPUT_DIR)
}
catch (e) {
  if (e instanceof $.ShellError && e.stderr.toString().includes('error: 0')) {
    // Some bun pm trust commands exit with code 0 but still write to stderr
  }
  else {
    throw e
  }
}

function mkdirIfNotExists(dir: string) {
  try {
    mkdirSync(dir, { recursive: true })
  }
  catch (error) {
    if ((error as ErrnoException)?.code !== 'EEXIST') {
      throw error
    }
  }

  return dir
}
