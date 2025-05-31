import { cpSync, mkdirSync } from 'node:fs'
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
const OUTPUT_DIR = mkdirIfNotExists(resolve(join(process.cwd(), 'apps', 'devu', 'tauri', 'resources', 'api')))

const lockFileContent = await Bun.file(join(process.cwd(), 'bun.lock')).text()
const externals = {
  libsql: lockFileContent.split('\n').find(line => line.includes('"libsql@'))?.match(/libsql@([^"]+)"/)?.[1],
}
const externalArgs = Object.keys(externals).map(e => `--external ${e}`).join(' ')
await $`bun build --target bun ${externalArgs} --outdir ${OUTPUT_DIR} --minify index.ts`.cwd(SOURCE_DIR)

mkdirIfNotExists(join(OUTPUT_DIR, 'database', 'migrations'))
cpSync(join(SOURCE_DIR, 'database', 'migrations'), join(OUTPUT_DIR, 'database', 'migrations'), { recursive: true })

mkdirIfNotExists(join(OUTPUT_DIR, 'static'))
cpSync(join(SOURCE_DIR, 'static'), join(OUTPUT_DIR, 'static'), { recursive: true })

// Install external dependencies
Bun.write(Bun.file(join(OUTPUT_DIR, 'package.json')), JSON.stringify({ dependencies: externals }))
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
