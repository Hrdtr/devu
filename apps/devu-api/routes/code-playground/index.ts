import { srv } from '@/utils'
import { codePlaygroundExecutionHistory } from './execution-histories'

export const codePlayground = srv
  .prefix('/code-playground')
  .router({
    executionHistory: codePlaygroundExecutionHistory,
  })
