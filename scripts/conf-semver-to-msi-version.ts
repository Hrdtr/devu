import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

/**
 * MSI Version Encoding in three fields: major.minor.build
 *
 * We reserve 401 “build” slots per semver patch:
 *   • 0–199   for alpha.N   (up to 200 alphas)
 *   • 200–399 for beta.N    (up to 200 betas)
 *   • 400     for stable
 *
 * MSI limits:
 *   • major ≤ 255, minor ≤ 255
 *   • build ≤ 65 535
 *
 * Therefore:
 *   MAX_BUILD = 65535
 *   BUCKET_SIZE = 401
 *   MAX_PATCH = floor(65535 / 401) = 163
 *
 * You can safely use semver.patch z up to 163, and prerelease N up to 199.
 *
 * Example mappings for x.y.z (major=1, minor=2):
 *   • 1.2.3-alpha.0  → build = 3*401 +   0 = 1203  → MSI: 1.2.1203
 *   • 1.2.3-alpha.199→ build = 3*401 + 199 = 1402  → MSI: 1.2.1402
 *   • 1.2.3-beta.0   → build = 3*401 + 200 = 1403  → MSI: 1.2.1403
 *   • 1.2.3-beta.199 → build = 3*401 + 399 = 1602  → MSI: 1.2.1602
 *   • 1.2.3          → build = 3*401 + 400 = 1603  → MSI: 1.2.1603
 */

const configPaths = [
  'apps/devu/tauri/tauri.alpha.conf.json',
  'apps/devu/tauri/tauri.beta.conf.json',
  'apps/devu/tauri/tauri.conf.json',
].map((path) => {
  // Convert POSIX-style paths to platform-specific paths for proper resolution on Windows
  return resolve(process.cwd(), ...path.split('/'))
})

const BUCKET_SIZE = 401 // slots per patch
const MAX_BUILD = 65535
const MAX_PATCH = Math.floor(MAX_BUILD / BUCKET_SIZE) // = 163
const MAX_PRE = 199 // max alpha.N or beta.N

for (const path of configPaths) {
  const raw = readFileSync(path, 'utf-8')
  const cfg = JSON.parse(raw)

  // Parse semver: "x.y.z" or "x.y.z-alpha.N" / "x.y.z-beta.N"
  let [base, pre] = cfg.version.split('-', 2) // eslint-disable-line prefer-const
  let [major, minor, patch] = base.split('.').map((n: string) => Number.parseInt(n, 10))

  // Clamp patch to safe maximum
  if (patch > MAX_PATCH)
    patch = MAX_PATCH

  // Determine offset within the 401-size bucket
  let offset = 400 // stable release
  if (pre) {
    const [tag, n] = pre.split('.')
    const num = Math.min(Number.parseInt(n, 10) || 0, MAX_PRE)
    if (tag === 'alpha')
      offset = num // 0..199
    else if (tag === 'beta')
      offset = 200 + num // 200..399
  }

  // Compute final three-field MSI build number
  const build = patch * BUCKET_SIZE + offset

  // Write back the new MSI-friendly version
  cfg.version = `${major}.${minor}.${build}`
  writeFileSync(path, `${JSON.stringify(cfg, null, 2)}\n`)

  console.info(`Patched ${path} → ${cfg.version}`)
}
