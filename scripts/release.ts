import process from 'node:process'
import { $ } from 'bun'
import semver from 'semver'

// const currentBranch = (await $`git rev-parse --abbrev-ref HEAD`.text()).trim()
// if (currentBranch !== 'test') {
//   console.error(`\nCannot run release script from '${currentBranch}' branch. Switch to 'main' first.\n`)
//   process.exit(1)
// }

// const status = (await $`git status --porcelain`.text()).trim()
// if (status.length > 0) {
//   console.error(`\nYou have uncommitted changes. Please commit or stash them before continuing.\n`)
//   process.exit(1)
// }

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')

const bumpArgs = ['run', './scripts/bump-version.ts', ...args]

// Determine next version
const output = (await $`bun ${bumpArgs}`.text()).trim()
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

console.info(`\n> Bumping version to '${nextVersion}'\n`)

if (!dryRun) {
  await $`bun ${bumpArgs}`
}

console.info(`\n> Committing and pushing to '${targetBranch}' branch\n`)

if (!dryRun) {
  await $`git add .`
  await $`git commit -m "chore(release): v${nextVersion}"`
  await $`git push origin HEAD:${targetBranch}`
}
else {
  console.info('[dry-run] Skipping commit & push')
}

console.info('\nRelease complete.\n')
