import { execSync } from 'node:child_process'
import process from 'node:process'
import { parseArgs } from 'node:util'

const { values: argv } = parseArgs({
  args: Bun.argv,
  options: {
    out: {
      type: 'string',
      short: 'o',
      default: 'dist/serve',
    },
  },
  strict: true,
  allowPositionals: true,
})

const rustInfo = execSync('rustc -vV', { encoding: 'utf-8' })
// eslint-disable-next-line regexp/no-useless-flag
const targetTriple = process.env.API_BUILD_TARGET_TRIPLE || /host: (\S+)/g.exec(rustInfo)?.[1]
if (!targetTriple) {
  throw new Error('Failed to determine platform target triple')
}
const ext = process.platform === 'win32' ? '.exe' : ''
const outfile = `${argv.out}-${targetTriple}${ext}`
execSync(`bun build src/index.ts --compile --bytecode --outfile ${outfile}`, {
  stdio: 'inherit',
})
