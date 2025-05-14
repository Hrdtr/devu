import process from 'node:process'
import { $ } from 'bun'
import semver from 'semver'

const currentBranch = (await $`git rev-parse --abbrev-ref HEAD`.text()).trim()
if (currentBranch !== 'main') {
  console.error(`\nCannot run release script from '${currentBranch}' branch. Switch to 'main' first.\n`)
  process.exit(1)
}

const status = (await $`git status --porcelain`.text()).trim()
if (status.length > 0) {
  console.error(`\nYou have uncommitted changes. Please commit or stash them before continuing.\n`)
  process.exit(1)
}

// Ensure current commit is pushed to origin/main
const localHead = (await $`git rev-parse HEAD`.text()).trim()
const remoteHead = (await $`git rev-parse origin/main`.text()).trim()
if (localHead !== remoteHead) {
  console.error(`\nLocal 'main' branch is ahead or out of sync with 'origin/main'.\n`)
  console.error(`HEAD Local  : ${localHead}`)
  console.error(`HEAD Branch : ${remoteHead}`)
  console.error(`\nPush your changes or pull the latest commits before continuing.\n`)
  process.exit(1)
}

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')

const bumpArgs = ['run', './scripts/bump-version.ts', ...args]
const dryRunBumpArgs = ['run', './scripts/bump-version.ts', ...args]
if (!dryRun) {
  dryRunBumpArgs.push('--dry-run')
}

// Determine next version
const output = (await $`bun ${dryRunBumpArgs}`.text()).trim()
const match = output.match(/Bumping version from .* to (.+)/)
if (!match || !semver.valid(match[1])) {
  console.error('Could not parse next version from bump-version output')
  process.exit(1)
}
const nextVersion = match[1] as string
if (!semver.valid(nextVersion)) {
  console.error(`Invalid version: ${nextVersion}`)
  process.exit(1)
}

// Determine target branch
const prerelease = semver.prerelease(nextVersion)
let targetBranch = 'stable'
if (prerelease && prerelease.length > 0) {
  const tag = prerelease[0]
  if (tag === 'beta' || tag === 'alpha') {
    targetBranch = tag
  }
  else {
    console.error(
      `Unknown prerelease tag: ${tag}. Expected 'alpha' or 'beta'.`,
    )
    process.exit(1)
  }
}

if (!dryRun) {
  await $`bun ${bumpArgs}`
}

console.info(`\nCommitting and pushing to '${targetBranch}' branch\n`)

if (!dryRun) {
  await $`git add .`
  await $`git commit -m "chore(release): v${nextVersion}"`
  await $`git push origin HEAD:${targetBranch} -f`
  await $`git push origin main`
}
else {
  console.info('[dry-run] Skipping commit & push')
}

console.info('\nRelease workflow has been started.\n')
