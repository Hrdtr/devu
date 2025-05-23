// This isn't really used rn. We need to wait for full offline support of LiveCodes
// See: https://github.com/live-codes/livecodes/issues/807
import { mkdirSync, rmdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import process from 'node:process'
import AdmZip from 'adm-zip'

const REPO = 'live-codes/livecodes'
const TMP_DIR = mkdirIfNotExists(resolve(join(process.cwd(), 'tmp', 'livecodes')))
const STATIC_DIR = mkdirIfNotExists(resolve(join(process.cwd(), 'static')))
const OUTPUT_DIR = join(STATIC_DIR, 'livecodes')

mkdirSync(TMP_DIR, { recursive: true })

try {
  rmdirSync(OUTPUT_DIR, { recursive: true })
}
catch {}
mkdirSync(OUTPUT_DIR, { recursive: true })

const downloadUrl = await getDownloadUrl()
console.info(`Downloading assets from ${downloadUrl}`)
const zipPath = join(TMP_DIR, 'archive.zip')

// Download the archive
const response = await retry(() => fetch(downloadUrl), 3)
if (!response.ok) {
  throw new Error(`Download failed: ${response.statusText}`)
}
const arrayBuffer = await response.arrayBuffer()
await Bun.write(zipPath, arrayBuffer)

// Unzip manually
await unzipFile(zipPath, OUTPUT_DIR)

// Cleanup
rmdirSync(TMP_DIR, { recursive: true })

async function getDownloadUrl() {
  const response = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`).then(res => res.json() as any)
  return response.assets.find((asset: any) => asset.name.endsWith('.zip')).browser_download_url
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

async function unzipFile(zipPath: string, outputPath: string) {
  const zip = new AdmZip(zipPath)
  zip.extractAllTo(outputPath, true, true)
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
