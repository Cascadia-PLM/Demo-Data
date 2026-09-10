/**
 * Generate pre-converted GLB + PNG thumbnail for every STEP in robot-arm/step/.
 *
 * One-time tooling. Pulls the published cad-converter image if needed, then runs
 * a single container that iterates the STEP directory and writes GLB + thumbnail
 * outputs back into the dataset tree.
 *
 * Run with:
 *   tsx scripts/prepare-demo-cad.ts
 *
 * Env:
 *   CAD_IMAGE    override image ref (default: the published cascadia-cad-converter)
 *   FORCE        set to 1 to re-convert files that already have a GLB
 *   ONLY         substring filter on STEP basename (e.g., ONLY=SHOULDER)
 *   SKIP_THUMBS  set to 1 to leave existing thumbnails alone (geometry-only re-bake)
 *
 * The converter used to be built from workers/cad-converter in the Cascadia-App
 * repo. That path does not exist here, so we pull the image the Cascadia-App CI
 * already publishes. Point CAD_IMAGE at a locally-built tag to test a converter
 * change before it lands.
 */

import { execFileSync, execSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')
const DEMO_DIR = join(REPO_ROOT, 'robot-arm')
const STEP_DIR = join(DEMO_DIR, 'step')
const GLB_DIR = join(DEMO_DIR, 'glb')
const THUMB_DIR = join(DEMO_DIR, 'thumbnails')
const NODE_DIR = join(DEMO_DIR, 'nodes')
const SCRIPT_DIR = join(REPO_ROOT, 'scripts')
const PYTHON_SCRIPT = join(SCRIPT_DIR, '_prepare-demo-cad.py')

const IMAGE = process.env.CAD_IMAGE ?? 'ghcr.io/cascadia-plm/cascadia-cad-converter:latest'

function run(cmd: string, args: Array<string>, opts: { quiet?: boolean } = {}): void {
  if (!opts.quiet) console.log(`$ ${cmd} ${args.join(' ')}`)
  const result = spawnSync(cmd, args, { stdio: 'inherit' })
  if (result.status !== 0) {
    throw new Error(`Command failed: ${cmd} ${args.join(' ')}`)
  }
}

function imageExists(tag: string): boolean {
  try {
    const out = execFileSync('docker', ['image', 'inspect', tag], { stdio: 'pipe' })
    return out.length > 0
  } catch {
    return false
  }
}

// ----------------------------------------------------------------------------
// Pre-flight
// ----------------------------------------------------------------------------

if (!existsSync(STEP_DIR)) {
  console.error(`No step directory at ${STEP_DIR}. Run scripts/build-demo-manifest.ts first.`)
  process.exit(1)
}
if (!existsSync(PYTHON_SCRIPT)) {
  console.error(`Missing helper script: ${PYTHON_SCRIPT}`)
  process.exit(1)
}

const steps = readdirSync(STEP_DIR).filter((f) => f.toLowerCase().endsWith('.step')).sort()
if (steps.length === 0) {
  console.error(`No .step files in ${STEP_DIR}.`)
  process.exit(1)
}

console.log(`[prepare-demo-cad] ${steps.length} STEP files to process`)
console.log(`[prepare-demo-cad] image=${IMAGE}`)

mkdirSync(GLB_DIR, { recursive: true })
mkdirSync(THUMB_DIR, { recursive: true })
mkdirSync(NODE_DIR, { recursive: true })

// ----------------------------------------------------------------------------
// Pull the converter image if missing
// ----------------------------------------------------------------------------

if (!imageExists(IMAGE)) {
  console.log(`[prepare-demo-cad] pulling ${IMAGE} (this may take a few minutes)`)
  run('docker', ['pull', IMAGE])
} else {
  console.log(`[prepare-demo-cad] image already present, skipping pull`)
}

// ----------------------------------------------------------------------------
// Run the conversion in one container
// ----------------------------------------------------------------------------

// On Windows, Docker accepts both forms; using the absolute path that exists in WSL/Git-Bash.
const args: Array<string> = [
  'run', '--rm',
  '-v', `${DEMO_DIR}:/work`,
  '-v', `${SCRIPT_DIR}:/host-scripts:ro`,
  '-e', 'PYTHONUNBUFFERED=1',
  '-e', `FORCE=${process.env.FORCE ?? '0'}`,
  '-e', `ONLY=${process.env.ONLY ?? ''}`,
  '-e', `SKIP_THUMBS=${process.env.SKIP_THUMBS ?? '0'}`,
  '--entrypoint', 'sh',
  IMAGE,
  '-c',
  // Start Xvfb so render_thumbnail has a display, then run the Python helper.
  'Xvfb :99 -screen 0 512x512x24 -nolisten tcp >/dev/null 2>&1 & sleep 1; '
  + 'export DISPLAY=:99; '
  + 'exec python /host-scripts/_prepare-demo-cad.py /work',
]

console.log(`[prepare-demo-cad] starting container...`)
run('docker', args)

// ----------------------------------------------------------------------------
// Verify outputs
// ----------------------------------------------------------------------------

const glbs = readdirSync(GLB_DIR).filter((f) => f.endsWith('.glb'))
const thumbs = readdirSync(THUMB_DIR).filter((f) => f.endsWith('.png'))
const nodeFiles = readdirSync(NODE_DIR).filter((f) => f.endsWith('.json'))

// How many models the viewer will be able to take apart, and into how many
// parts. A model with no nodes is a single part, which is not a failure.
let structured = 0
let parts = 0
for (const f of nodeFiles) {
  const { nodes } = JSON.parse(readFileSync(join(NODE_DIR, f), 'utf-8')) as {
    nodes: Array<unknown>
  }
  if (nodes.length > 0) structured += 1
  parts += nodes.length
}

console.log()
console.log(`  STEP inputs:  ${steps.length}`)
console.log(`  GLB outputs:  ${glbs.length}`)
console.log(`  Thumbnails:   ${thumbs.length}`)
console.log(`  Selectable:   ${structured} assemblies, ${parts} parts`)

if (glbs.length === 0) {
  console.error('No GLBs produced. Check container logs above.')
  process.exit(1)
}
