'use client'

import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { Models } from 'appwrite'
import { useAppwrite } from '../AppwriteProvider'

/**
 * Access to the file object by its unique file ID.
 * @param bucketId Storage bucket unique ID
 * @param fileId  File ID
 * @param options Options to pass to `react-query`
 * @link [Appwrite Documentation](https://appwrite.io/docs/client/storage?sdk=web-default#storageGetFile)
 */
export function useFile(
  {
    bucketId,
    fileId,
    ...options
  }: {
    bucketId: string
    fileId: string
  } & UseQueryOptions<Models.File, unknown, Models.File, string[]>
) {
  const { storage } = useAppwrite()
  const queryClient = useQueryClient()
  const queryKey = useMemo(() => ['appwrite', 'storage', 'files', bucketId, fileId], [bucketId, fileId])
  const queryResult = useQuery({
    ...options,
    queryKey,
    queryFn: async ({ queryKey: [, , bucketId, fileId] }) => {
      return await storage.getFile({ bucketId, fileId })
    },

  })

  useEffect(() => {
    const unsubscribe = storage.client.subscribe(`buckets.${bucketId}.files.${fileId}`, response => {
      queryClient.setQueryData(queryKey, response.payload)
    })

    return () => unsubscribe?.()
  }, [bucketId, fileId, queryKey])

  return queryResult
}