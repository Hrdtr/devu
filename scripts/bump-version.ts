/**
 * Bump version script using semver.
 *
 * Usage:
 *   bun ./scripts/bump-version.ts <patch|minor|major> [stable|unstable] [--unstable-identifier <identifier> | --unstable-identifier=<identifier>]
 *
 * Examples:
 *   bun ... patch stable                                -> 1.0.0 -> 1.0.1
 *   bun ... minor                                       -> 1.0.0 -> 1.1.0 (defaults to stable)
 *   bun ... patch unstable --unstable-identifier beta   -> 1.0.0 -> 1.0.1-beta.0
 *   bun ... minor unstable --unstable-identifier alpha  -> 1.0.0 -> 1.1.0-alpha.0
 *   bun ... minor unstable                              -> 1.0.0 -> 1.1.0-0
 *   bun ...                                             -> 1.0.1-beta.0 -> 1.0.1-beta.1 (bump prerelease)
 *   bun ... stable                                      -> 1.0.1-beta.1 -> 1.0.1 (opt-out prerelease)
 *   bun ... --unstable-identifier alpha                 -> 1.0.1-beta.1 -> 1.0.2-alpha.0 (change identifier and reset prerelease)
 *
 * Behavior:
 * - Stable bump: patch/minor/major increments the version as usual.
 * - Unstable bump: Can only be done if current version is stable.
 * - Once unstable (e.g., 1.0.1-beta.0), script is locked:
 *    - No releaseType needed to increment prerelease (just run with no args)
 *    - To change identifier, only pass --unstable-identifier (no releaseType)
 *    - To opt-out, run with 'stable' as first arg
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import semver from 'semver'

const dryRun = process.argv.includes('--dry-run')
// Support both --unstable-identifier beta and --unstable-identifier=beta
const unstableIdentifierArg = process.argv.find(arg =>
  arg.startsWith('--unstable-identifier'),
)
let unstableIdentifier: string | undefined
if (unstableIdentifierArg) {
  if (unstableIdentifierArg.includes('=')) {
    unstableIdentifier = unstableIdentifierArg.split('=')[1]
  }
  else {
    const idx = process.argv.indexOf(unstableIdentifierArg)
    unstableIdentifier = process.argv[idx + 1]
  }
}

const args = process.argv.slice(2).filter((arg) => {
  const trimmed = arg.trim()
  return (
    trimmed !== '--dry-run'
    && trimmed !== unstableIdentifierArg
    && trimmed !== unstableIdentifier
  )
})

const rootPackagePath = resolve(process.cwd(), 'package.json')
const rootPackage = JSON.parse(readFileSync(rootPackagePath, 'utf-8'))
const currentVersion = rootPackage.version
const currentPrerelease = semver.prerelease(currentVersion)
const currentIsStable
  = currentPrerelease === null || currentPrerelease.length === 0

const releaseType = args[0] as
  | 'patch'
  | 'minor'
  | 'major'
  | 'stable' // `stable` means opt-out of prerelease
  | undefined

const stability = (
  args[1] ? args[1] : currentIsStable ? 'stable' : 'unstable'
) as 'stable' | 'unstable'

if (!['stable', 'unstable'].includes(stability)) {
  console.error('Second argument must be "stable" or "unstable" if provided')
  process.exit(1)
}

let nextVersion: string

if (!currentIsStable) {
  // === LOCKED PRERELEASE MODE ===
  if (releaseType && releaseType !== 'stable') {
    console.error(
      'Cannot bump major/minor/patch when in prerelease mode. Use no release type to bump prerelease, "stable" to opt-out, or --unstable-identifier to change it',
    )
    process.exit(1)
  }
  if (releaseType === 'stable' && unstableIdentifier) {
    console.error(
      'Cannot set --unstable-identifier when opting out of prerelease',
    )
    process.exit(1)
  }
  if (stability === 'stable') {
    console.error('Cannot change stability when in prerelease mode')
    process.exit(1)
  }

  const [currentId] = currentPrerelease

  if (releaseType === 'stable') {
    // Opt-out of prerelease: strip identifier (e.g., beta.1 -> final)
    const parsed = semver.parse(currentVersion)
    if (!parsed) {
      console.error('Invalid current version')
      process.exit(1)
    }
    const newVersion = `${parsed.major}.${parsed.minor}.${parsed.patch}`
    nextVersion = newVersion
  }
  else if (unstableIdentifier && unstableIdentifier !== currentId) {
    // Change identifier: reset prerelease to 0 with new name
    const newVersion = semver.inc(
      currentVersion,
      'prerelease',
      unstableIdentifier,
    )
    if (!newVersion) {
      console.error('Failed to apply new identifier')
      process.exit(1)
    }
    nextVersion = newVersion
  }
  else {
    // Default case: just bump prerelease number
    const newVersion = semver.inc(
      currentVersion,
      'prerelease',
      currentId as string,
    )
    if (!newVersion) {
      console.error('Failed to bump prerelease')
      process.exit(1)
    }
    nextVersion = newVersion
  }
}
else {
  // === STABLE MODE ===
  if (
    !releaseType
    || releaseType === 'stable'
    || !['patch', 'minor', 'major'].includes(releaseType)
  ) {
    console.error('Missing or invalid release type (patch | minor | major)')
    process.exit(1)
  }
  if (stability === 'stable' && unstableIdentifier) {
    console.error('Cannot set --unstable-identifier when bumping to stable')
    process.exit(1)
  }

  if (stability === 'unstable') {
    // Transitioning from stable to unstable
    const newVersion = semver.inc(
      currentVersion,
      `pre${releaseType}`,
      unstableIdentifier,
    )
    if (!newVersion) {
      console.error('Failed to initialize unstable version')
      process.exit(1)
    }
    nextVersion = newVersion
  }
  else {
    // Normal stable bump
    const newVersion = semver.inc(currentVersion, releaseType)
    if (!newVersion) {
      console.error('Failed to bump stable version')
      process.exit(1)
    }
    nextVersion = newVersion
  }
}

if (!nextVersion) {
  console.error('Failed to determine next version')
  process.exit(1)
}

console.info(`Bumping version from ${currentVersion} to ${nextVersion}`)

function safeWriteFile(path: string, content: string) {
  if (dryRun) {
    console.info(`[dry-run] Would write to ${path}:\n${content}\n`)
  }
  else {
    writeFileSync(path, content, 'utf-8')
    console.info(`${path} updated`)
  }
}

const originalFiles: Record<string, string> = {}

try {
  const nextPrerelease = semver.prerelease(nextVersion)
  const nextIsStable = nextPrerelease === null || nextPrerelease.length === 0

  // const rootPackagePath = resolve(process.cwd(), 'package.json') // Already defined above.
  const apiPackagePath = resolve(process.cwd(), 'apps/devu-api/package.json')
  const packagePath = resolve(process.cwd(), 'apps/devu/package.json')
  const configStablePath = resolve(process.cwd(), 'apps/devu/tauri/tauri.conf.json')
  const configBetaPath = resolve(process.cwd(), 'apps/devu/tauri/tauri.beta.conf.json')
  const cargoTomlPath = resolve(process.cwd(), 'apps/devu/tauri/Cargo.toml')

  const configPath = nextIsStable ? configStablePath : configBetaPath

  // package.json
  for (const path of [rootPackagePath, apiPackagePath, packagePath]) {
    originalFiles[path] = readFileSync(path, 'utf-8')
    const pkg = JSON.parse(originalFiles[path])
    safeWriteFile(
      packagePath,
      `${JSON.stringify({ ...pkg, version: nextVersion }, null, 2)}\n`,
    )
  }

  // tauri[.beta].conf.json
  originalFiles[configPath] = readFileSync(configPath, 'utf-8')
  const conf = JSON.parse(originalFiles[configPath])
  safeWriteFile(
    configPath,
    `${JSON.stringify({ ...conf, version: nextVersion }, null, 2)}\n`,
  )

  // Cargo.toml
  originalFiles[cargoTomlPath] = readFileSync(cargoTomlPath, 'utf-8')
  let cargoToml = originalFiles[cargoTomlPath]
  const cargoVersionRegex = /^version\s*=\s*".*?"/m
  if (cargoVersionRegex.test(cargoToml)) {
    cargoToml = cargoToml.replace(
      cargoVersionRegex,
      `version = "${nextVersion}"`,
    )
    safeWriteFile(cargoTomlPath, cargoToml)
  }
  else {
    throw new Error(
      `Could not find 'version = "..."' in the [package] section of ${cargoTomlPath}`,
    )
  }

  if (dryRun) {
    console.info('\nDry run complete. No files were changed.\n')
  }
  else {
    console.info('\nVersion bump complete.\n')
  }
}
catch (error) {
  console.error('\nError during version bump:', error)
  if (!dryRun) {
    console.warn('Rolling back changes...')
    Object.entries(originalFiles).forEach(([path, content]) => {
      writeFileSync(path, content, 'utf-8')
      console.warn(`[rollback] Restored ${path}`)
    })
  }
  process.exit(1)
}
