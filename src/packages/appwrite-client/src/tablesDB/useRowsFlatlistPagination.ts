'use client'

import { useInfiniteQuery, UseQueryOptions, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { Models, Query } from 'appwrite'
import type { TableRowOperation, TableRow } from './types'
import { useAppwrite } from '../AppwriteProvider'

const PAGE_SIZE = 8;


export function useRowsFlatlistPagination<TRow>({
    databaseId,
    tableId,
    queries = [],
    pageSize = PAGE_SIZE,
}: {
    databaseId: string
    tableId: string
    queries?: string[]
    options?: UseQueryOptions<Models.RowList<TableRow<TRow>>, unknown, Models.RowList<TableRow<TRow>>, (string | {
        queries: string[]
    })[]>
    pageSize?: number
}) {
    const _pageSize = pageSize ?? PAGE_SIZE;
    const { tablesDB } = useAppwrite()
    const queryClient = useQueryClient()
    const queryKey = useMemo(() => ['appwrite', 'databases', 'infiniti-data', databaseId, tableId, { queries }, _pageSize], [databaseId, tableId, queries, _pageSize])
    const {
        data,
        isLoading,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
    } = useInfiniteQuery({
        queryKey,
        queryFn: async ({ pageParam = null }) => {
            const query = [
                ...queries,
                Query.limit(_pageSize),
            ]
            if (pageParam) {
                query.push(Query.cursorAfter(pageParam))
            }
            return await tablesDB.listRows<TableRow<TRow>>({
                databaseId,
                tableId,
                queries: query,
                total: false
            })
        },
        getNextPageParam: (lastPage) => lastPage.rows?.[lastPage.rows.length - 1]?.$id ?? null,
        initialPageParam: null as string | null,
    })

    useEffect(() => {
        console.log('=========')
        console.log('queryKey', queryKey)
        console.log('=========')
    }, [queryKey])


    const onEndReached = () => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    };


    const items: TRow[] = useMemo(() => {
        const map = new Map<string, TRow>();
        for (const page of data?.pages ?? []) {
            for (const d of page.rows) map.set(d.$id, d);
        }
        return Array.from(map.values());
    }, [data]);

    const hardRefresh = async () => {
        await queryClient.resetQueries({
            queryKey: queryKey,
        });
    };

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
                            queryClient.setQueryData<InfiniteData<Models.RowList<TableRow<TRow>>>>(queryKey, (old) => {
                                if (!old) return old;
                                return {
                                    ...old,
                                    pages: old.pages.map((page, idx) => {
                                        if (idx !== 0) return page;
                                        const exists = page.rows.some(r => r.$id === row.$id);
                                        if (exists) return page;
                                        return {
                                            ...page,
                                            rows: [row, ...page.rows],
                                        };
                                    }),
                                }
                            })
                            break
                        case 'update':
                            queryClient.setQueryData(['appwrite', 'databases', databaseId, tableId, 'rows', row.$id], row)
                            queryClient.setQueryData<InfiniteData<Models.RowList<TableRow<TRow>>>>(queryKey, (old) => {
                                if (!old) return old;
                                console.log('update->old', old)

                                return {
                                    ...old,
                                    pages: old.pages.map((page) => ({
                                        ...page,
                                        rows: page.rows.map((r) => r.$id === row.$id ? row : r)
                                    }))
                                }
                            })
                            break
                        case 'delete':
                            queryClient.setQueryData(['appwrite', 'databases', databaseId, tableId, 'rows', row.$id], undefined)
                            queryClient.setQueryData<InfiniteData<Models.RowList<TableRow<TRow>>>>(queryKey, (old) => {
                                if (!old) return old;
                                return {
                                    ...old,
                                    pages: old.pages.map((page) => ({
                                        ...page,
                                        rows: page.rows.filter(r => r.$id !== row.$id)
                                    }))
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
    }, [databaseId, tableId, queries, queryClient, tablesDB, queryKey])

    return {
        refreshing: isLoading,
        data: items,
        onRefresh: hardRefresh,
        onEndReached
    }
}

