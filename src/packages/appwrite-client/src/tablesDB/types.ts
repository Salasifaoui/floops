import type { Models } from 'appwrite'

export type TableRowOperation =
  | 'create'
  | 'update'
  | 'delete'

export type TableRow<T> = T & Models.Row
export type DatabaseTable<T> = TableRow<T>[]