'use client'

import { useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query'
import { Models } from 'appwrite'
import { useEffect, useMemo } from 'react'
import { useAppwrite } from '../AppwriteProvider'
import type { TableRowOperation, TableRow } from './types'

/**
 * Fetches rows from a table.
 * @param databaseId The database the table belongs to.
 * @param tableId The table to fetch rows from.
 * @param queries Queries to filter the rows by.
 * @param options Options to pass to `react-query`.
 * @link [Appwrite Documentation](https://appwrite.io/docs/client/databases?sdk=web-default#tablesDBListRows)
 */
export function useRows<TRow>({
    databaseId,
    tableId,
    queries = [],
    options
}: {
    databaseId: string
    tableId: string
    queries?: string[]
    options?: UseQueryOptions<Models.RowList<TableRow<TRow>>, unknown, Models.RowList<TableRow<TRow>>, (string | {
        queries: string[]
    })[]>
} & any) {
    const { tablesDB } = useAppwrite()
    const queryClient = useQueryClient()
    const queryKey = useMemo(() => ['appwrite', 'databases', databaseId, tableId, { queries }], [databaseId, tableId, queries])
    const queryResult = useQuery({
        enabled: !!databaseId && !!tableId,
        ...options,
        queryKey,
        queryFn: async () => {
            return await tablesDB.listRows<TableRow<TRow>>({
                databaseId,
                tableId,
                queries
            })
        }
    })

    useEffect(() => {
        let unsubscribe: (() => void) | null = null;

        const setupSubscription = () => {
            try {
                unsubscribe = tablesDB.client.subscribe(`databases.${databaseId}.tables.${tableId}.rows`, response => {
                    if (!response.events?.[0]) return;

                    const match = response.events[0].match(/\.(\w+)$/);
                    if (!match) return;

                    const [, operation] = match;
                    const row = response.payload as TableRow<TRow>;

                    switch (operation as TableRowOperation) {
                        case 'create':
                            queryClient.setQueryData(['appwrite', 'databases', databaseId, tableId, 'rows', row.$id], row)
                            if (queries?.length) {
                                queryClient.invalidateQueries({ queryKey: ['appwrite', 'databases', databaseId, tableId, { queries }] })
                            } else {
                                queryClient.setQueryData(['appwrite', 'databases', databaseId, tableId, { queries }], (old: Models.RowList<TableRow<TRow>> | undefined) => {
                                    if (!old) return old;
                                    return {
                                        ...old,
                                        rows: [...old.rows, row]
                                    }
                                })
                            }
                            break
                        case 'update':
                            queryClient.setQueryData(['appwrite', 'databases', databaseId, tableId, 'rows', row.$id], row)
                            // Realtime payload often has flat relation IDs only; list was fetched with relation selects.
                            // Invalidate so we refetch with the same queries and keep store.*, driver.* etc.
                            if (queries?.length) {
                                queryClient.invalidateQueries({ queryKey: ['appwrite', 'databases', databaseId, tableId, { queries }] })
                            } else {
                                queryClient.setQueryData(['appwrite', 'databases', databaseId, tableId, { queries }], (old: Models.RowList<TableRow<TRow>> | undefined) => {
                                    if (!old) return old;
                                    return {
                                        ...old,
                                        rows: old.rows.map(r => r.$id === row.$id ? row : r)
                                    }
                                })
                            }
                            break
                        case 'delete':
                            queryClient.setQueryData(['appwrite', 'databases', databaseId, tableId, 'rows', row.$id], undefined)
                            queryClient.setQueryData(['appwrite', 'databases', databaseId, tableId, { queries }], (old: Models.RowList<TableRow<TRow>> | undefined) => {
                                if (!old) return old;
                                return {
                                    ...old,
                                    rows: old.rows.filter(r => r.$id !== row.$id)
                                }
                            })
                            break
                    }
                })
            } catch (error) {
                console.error('Failed to setup Appwrite subscription:', error);
            }
        };

        setupSubscription();

        return () => {
            if (unsubscribe) {
                try {
                    unsubscribe();
                } catch (error) {
                    console.error('Failed to cleanup Appwrite subscription:', error);
                }
            }
        }
    }, [databaseId, tableId, queries, queryClient, tablesDB])

    return queryResult
}

