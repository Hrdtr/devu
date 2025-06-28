import type { PyodideInterface } from 'pyodide'
import type { ExecConfigBase, ExecEvent } from '../_shared/types'
import type { Input, Options } from './definition'
import process from 'node:process'
import { loadPyodide } from 'pyodide'

interface WorkerMessage {
  type: 'start'
  input: Input
  config: Omit<ExecConfigBase, 'abortSignal' | 'stdout' | 'stderr'> & { options: Options }
}

interface AbortMessage {
  type: 'abort'
}

let pyodide: PyodideInterface | null = null
let interruptBuffer: Uint8Array | null = null
let currentExecutionId: string | null = null

async function initializePyodide() {
  if (pyodide) {
    console.info('[code-playground:python-worker] Pyodide already initialized.')
    return pyodide
  }

  console.info('[code-playground:python-worker] Initializing Pyodide...')
  pyodide = await loadPyodide({
    stdout: (message: string) => {
      const trimmed = message.trim()
      if (trimmed) {
        globalThis.postMessage({ type: 'stdout', data: trimmed })
      }
    },
    stderr: (message: string) => {
      const trimmed = message.trim()
      if (trimmed) {
        globalThis.postMessage({ type: 'stderr', data: trimmed })
      }
    },
  })

  try {
    interruptBuffer = new Uint8Array(new SharedArrayBuffer(1))
    console.info('[code-playground:python-worker] Using SharedArrayBuffer for interrupt.')
  }
  catch (e) {
    console.warn('[code-playground:python-worker] SharedArrayBuffer not available, using ArrayBuffer fallback:', e)
    interruptBuffer = new Uint8Array(new ArrayBuffer(1))
  }
  pyodide.setInterruptBuffer(interruptBuffer)
  console.info('[code-playground:python-worker] Pyodide initialized.')
  return pyodide
}

// Single message handler that handles both start and abort messages
globalThis.onmessage = async (event: MessageEvent<WorkerMessage | AbortMessage>) => {
  if (event.data.type === 'abort') {
    console.warn(`[code-playground:python-worker] Abort signal received for execution ID: ${currentExecutionId}`)
    if (interruptBuffer) {
      interruptBuffer[0] = 2 // Signal interrupt
    }
    return
  }

  if (event.data.type === 'start') {
    const { input, config } = event.data
    currentExecutionId = config.id
    console.info(`[code-playground:python-worker] Received start message for execution ID: ${config.id}`)

    let executionComplete = false
    let executionError: Error | null = null

    try {
      pyodide = await initializePyodide()

      await pyodide.loadPackagesFromImports(input.python)

      const dict = pyodide.globals.get('dict')
      const globals = dict(Object.entries(config.options.context || {}))

      const executionPromise = pyodide.runPythonAsync(input.python, { globals })
        .then((result) => {
          executionComplete = true
          executionError = null
          return {
            type: 'result',
            data: { key: 'default', value: result ? String(result) : '' },
            error: null,
          } satisfies ExecEvent
        })
        .catch((error) => {
          executionComplete = true
          executionError = error instanceof Error ? error : new Error(String(error))
          return {
            type: 'result',
            data: null,
            error: error instanceof Error ? error.message : String(error),
          } satisfies ExecEvent
        })

      const startTime = Date.now()
      const MAX_EXECUTION_TIME = 300000 // 5 minutes timeout

      // Wait for execution to complete or timeout
      // eslint-disable-next-line no-unmodified-loop-condition
      while (!executionComplete && !executionError) {
        if (Date.now() - startTime > MAX_EXECUTION_TIME) {
          if (interruptBuffer) {
            interruptBuffer[0] = 2
          }
          throw new Error('Execution timeout')
        }

        if (executionComplete || executionError) {
          break
        }

        await new Promise(resolve => setTimeout(resolve, 10))
      }

      const result = await executionPromise
      globalThis.postMessage(result)
      console.info(`[code-playground:python-worker] Execution for execution ID ${config.id} complete.`)
    }
    catch (error) {
      console.error(`[code-playground:python-worker] Execution error for execution ID ${config.id}:`, error)
      globalThis.postMessage({
        type: 'result',
        data: null,
        error: error instanceof Error ? error.message : String(error),
      })
    }
    finally {
      // Cleanup resources
      try {
        if (pyodide) {
          pyodide.globals.destroy()
          console.info(`[code-playground:python-worker] Pyodide globals destroyed for execution ID: ${config.id}`)
        }
      }
      catch (cleanupError) {
        console.warn(`[code-playground:python-worker] Error during globals cleanup for execution ID ${config.id}:`, cleanupError)
      }

      currentExecutionId = null
      // Exit the worker after completion
      console.info(`[code-playground:python-worker] Exiting worker for execution ID: ${config.id}`)
      process.exit(0)
    }
  }
}
