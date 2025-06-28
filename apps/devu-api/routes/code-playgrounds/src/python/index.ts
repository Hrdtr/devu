import type { ExecConfigBase, ExecEvent } from '../_shared/types'
import type { Input, Options } from './definition'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Worker } from 'node:worker_threads'
// @ts-expect-error worker file
import workerFile from './worker.ts' with { type: 'file' }

export * from './definition'

export type ExecConfig = ExecConfigBase & {
  options: Options
}

export async function* exec(input: Input, config: ExecConfig): AsyncGenerator<ExecEvent> {
  console.info(`[code-playground:python] Starting worker for execution ID: ${config.id}`)
  const workerFileContent = await Bun.file(join(dirname(fileURLToPath(import.meta.url)), workerFile)).text()
  const workerFileBlob = new Blob([workerFileContent], { type: 'application/typescript' })
  const worker = new Worker(URL.createObjectURL(workerFileBlob))

  let workerExited = false
  let workerError: Error | null = null

  // Use a queue to buffer messages from the worker
  const messageQueue: ExecEvent[] = []
  let resolveMessage: (() => void) | null = null

  worker.on('message', (event: ExecEvent) => {
    messageQueue.push(event)
    if (resolveMessage) {
      resolveMessage()
      resolveMessage = null
    }
  })

  worker.on('error', (error: Error) => {
    console.error(`[code-playground:python] Worker error for execution ID ${config.id}:`, error)
    workerError = error
    if (resolveMessage) {
      resolveMessage()
      resolveMessage = null
    }
  })

  worker.on('exit', (code: number) => {
    console.info(`[code-playground:python] Worker exited for execution ID ${config.id} with code: ${code}`)
    workerExited = true
    if (code !== 0 && !workerError) {
      workerError = new Error(`Worker exited with non-zero code: ${code}`)
    }
    if (resolveMessage) {
      resolveMessage()
      resolveMessage = null
    }
  })

  // Send initial message to worker to start execution, excluding non-clonable properties
  const { abortSignal, ...rest } = config
  worker.postMessage({ type: 'start', input, config: rest })
  console.info(`[code-playground:python] Sent start message to worker for execution ID: ${config.id}`)

  // Set up abort handling
  if (config.abortSignal) {
    config.abortSignal.addEventListener('abort', () => {
      console.warn(`[code-playground:python] Abort signal received for execution ID: ${config.id}. Sending abort to worker.`)
      worker.postMessage({ type: 'abort' })
    }, { once: true })
  }

  // Loop to yield messages from the worker
  try {
    // eslint-disable-next-line no-unmodified-loop-condition
    while (!workerExited || messageQueue.length > 0) {
      console.info(`[code-playground:python] Loop state: workerExited=${workerExited}, messageQueue.length=${messageQueue.length}`)
      if (messageQueue.length > 0) {
        yield messageQueue.shift()!
      }
      else if (workerError) {
        throw workerError
      }
      else if (!workerExited) {
        console.info(`[code-playground:python] Waiting for message or exit...`)
        await new Promise<void>((resolve) => {
          resolveMessage = resolve
        })
        console.info(`[code-playground:python] Resumed from wait.`)
      }
    }
  }
  catch (error) {
    yield {
      type: 'result',
      data: null,
      error: error instanceof Error ? error.message : String(error),
    }
  }
  finally {
    console.info(`[code-playground:python] Worker execution loop finished for execution ID: ${config.id}`)
    // Ensure worker is terminated
    try {
      if (!workerExited) {
        worker.terminate()
        console.info(`[code-playground:python] Worker terminated for execution ID: ${config.id}`)
      }
    }
    catch (cleanupError) {
      console.warn(`[code-playground:python] Error terminating worker for execution ID ${config.id}:`, cleanupError)
    }
  }
}
