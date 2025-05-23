import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmdirSync,
} from 'node:fs'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { parseArgs } from 'node:util'
import AdmZip from 'adm-zip'
import { $ } from 'bun'

const { values: argv } = parseArgs({
  args: Bun.argv,
  options: {
    version: { type: 'string', default: 'latest' },
    os: { type: 'string', default: process.platform },
    arch: { type: 'string', default: process.arch },
    avx2: { type: 'boolean', default: true },
    profile: { type: 'boolean', default: false },
  },
  strict: true,
  allowPositionals: true,
})

const TMP_DIR = mkdirIfNotExists(resolve(join(process.cwd(), 'tmp', 'bun')))
const BIN_TARGET_DIR = mkdirIfNotExists(resolve(join(process.cwd(), 'apps', 'devu', 'tauri', 'binaries')))

// eslint-disable-next-line regexp/no-useless-flag
const targetTriple = Bun.env.SIDECAR_TARGET_TRIPLE || /host: (\S+)/g.exec(await $`rustc -vV`.text())?.[1]
if (!targetTriple) {
  throw new Error('Failed to determine platform target triple')
}
const ext = process.platform === 'win32' ? '.exe' : ''
const BUN_BINARY = `${join(BIN_TARGET_DIR, 'devu-bun')}-${targetTriple}${ext}`

if (existsSync(BUN_BINARY)) {
  console.info(`Bun already exists at ${BUN_BINARY}. Skipping download.`)
  process.exit(0)
}

const { version, os, arch, avx2, profile } = Object.fromEntries(
  Object.entries(argv).map(([k, v]) => [k, encodeURIComponent(v)]),
)
const DOWNLOAD_URL = new URL(`${version}/${os}/${arch}?avx2=${avx2}&profile=${profile}`, 'https://bun.sh/download/')

console.info(`Downloading Bun from ${DOWNLOAD_URL.href}`)

const zipPath = join(TMP_DIR, 'archive.zip')
const extractedDir = join(TMP_DIR, 'unzipped')

mkdirSync(TMP_DIR, { recursive: true })
mkdirSync(extractedDir, { recursive: true })

// Download the archive
const response = await retry(() => fetch(DOWNLOAD_URL.href), 3)
if (!response.ok) {
  throw new Error(`Download failed: ${response.statusText}`)
}
const arrayBuffer = await response.arrayBuffer()
await Bun.write(zipPath, arrayBuffer)

// Unzip manually
await unzipFile(zipPath, extractedDir)
const binaryPath = await findBunBinary(extractedDir)
try {
  renameSync(binaryPath, BUN_BINARY)
}
catch {
  copyFileSync(binaryPath, BUN_BINARY)
}

// Cleanup
rmdirSync(TMP_DIR, { recursive: true })

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

async function unzipFile(zipPath: string, outputPath: string) {
  const zip = new AdmZip(zipPath)
  zip.extractAllTo(outputPath, true, true)
}

async function findBunBinary(searchDir: string): Promise<string> {
  for (const entry of readdirSync(searchDir, { withFileTypes: true })) {
    const entryPath = join(searchDir, entry.name)

    // eslint-disable-next-line regexp/no-unused-capturing-group
    if (entry.isFile() && /^bun(.exe)?$/.test(entry.name))
      return entryPath

    if (entry.isFile() && /^bun.*\.zip$/.test(entry.name)) {
      const nestedExtract = join(searchDir, 'nested')
      mkdirSync(nestedExtract, { recursive: true })
      await unzipFile(entryPath, nestedExtract)
      return findBunBinary(nestedExtract)
    }

    // eslint-disable-next-line unicorn/prefer-string-starts-ends-with
    if (entry.isDirectory() && /^bun/.test(entry.name)) {
      return findBunBinary(entryPath)
    }
  }

  throw new Error('Could not find Bun binary in extracted content.')
}

async function retry<T>(fn: () => Promise<T>, attempts: number, delay = 5000): Promise<T> {
  try {
    return await fn()
  }
  catch (error) {
    if (attempts <= 0) {
      throw error
    }
    await new Promise(resolve => setTimeout(resolve, delay))
    return await retry(fn, attempts - 1, delay)
  }
}
