import type { DB } from '@/database'
import { os } from '@orpc/server'

export const srv = os.$context<{ db: DB }>()
export type Srv = typeof srv
