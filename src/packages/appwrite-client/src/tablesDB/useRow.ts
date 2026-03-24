'use client'

import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { useAppwrite } from '../AppwriteProvider'
import type { TableRow } from './types'

/**
 * Fetches a row from a table.
 * @param databaseId The database the table belongs to.
 * @param tableId The table the row belongs to.
 * @param rowId The row to fetch.
 * @param options Options to pass to `react-query`.
 */
export function useRow<TRow>(
  {
    databaseId,
    tableId,
    rowId,
    queries,
    options
  }: {
    databaseId: string
    tableId: string
    rowId: string
    queries?: string[]
    options?: Partial<UseQueryOptions<TableRow<TRow>, unknown, TableRow<TRow>, string[]>>
  }
) {
  const { tablesDB } = useAppwrite()
  const queryClient = useQueryClient()

  const queryKey = useMemo(() => ['appwrite', 'databases', databaseId, tableId, 'rows', rowId, 'queries', queries], [databaseId, tableId, rowId, queries])

  const queryResult = useQuery({
    ...options,
    queryKey,
    queryFn: async () => {
      return await tablesDB.getRow<TableRow<TRow>>({
        databaseId,
        tableId,
        rowId,
        queries
      })
    },
    enabled: !!rowId,
  })

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    const setupSubscription = () => {
      try {
        unsubscribe = tablesDB.client.subscribe(`databases.${databaseId}.tables.${tableId}.rows.${rowId}`, (response) => {
          // When we requested relations (queries), realtime payload often has flat IDs only.
          // Invalidate so we refetch with the same query and get fresh relations.
          if (queries?.length) {
            queryClient.invalidateQueries({ queryKey })
            return
          }
          queryClient.setQueryData(queryKey, response.payload)
        })
      } catch (error) {
        console.error('Failed to setup Appwrite row subscription:', error);
      }
    };

    setupSubscription();

    return () => {
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch (error) {
          console.error('Failed to cleanup Appwrite row subscription:', error);
        }
      }
    }
  }, [databaseId, tableId, rowId, queryKey, queryClient, tablesDB, queries])

  return queryResult
}

