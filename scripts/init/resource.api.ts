import {
  cpSync,
  mkdirSync,
} from 'node:fs'
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

await $`bun build --target bun --outdir ${OUTPUT_DIR} --minify index.ts`.cwd(SOURCE_DIR)
mkdirIfNotExists(join(OUTPUT_DIR, 'database', 'migrations'))
cpSync(join(SOURCE_DIR, 'database', 'migrations'), join(OUTPUT_DIR, 'database', 'migrations'), { recursive: true })

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
