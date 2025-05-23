// Building type declaration throws error if zod isn't imported
// eslint-disable-next-line unused-imports/no-unused-imports
import { z } from 'zod'
import { srv } from '@/utils'
import { codePlaygroundExecutionHistory } from './execution-histories'

export const codePlayground = srv
  .prefix('/code-playground')
  .router({
    executionHistory: codePlaygroundExecutionHistory,
  })
