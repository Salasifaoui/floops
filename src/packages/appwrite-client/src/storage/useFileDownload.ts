'use client'

import { UseQueryOptions, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useAppwrite } from '../AppwriteProvider'

/**
 * Retrieves a file URL for download.
 * @param bucketId The bucket the file belongs to.
 * @param fileId The unique ID of the file.
 * @param options Options to pass to `react-query`.
 * @link [Appwrite Documentation](https://appwrite.io/docs/client/storage?sdk=web-default#storageGetFileDownload)
 */
export function useFileDownload({
  bucketId,
  fileId,
  ...options
}: {
  bucketId?: string
  fileId?: string
} & UseQueryOptions<URL | null, unknown, URL | null, (string | void)[]>) {
  const { storage } = useAppwrite()
  const queryKey = useMemo(() => ['appwrite', 'storage', 'downloads', bucketId, fileId], [bucketId, fileId])
  const queryResult = useQuery({
    ...options,
    queryKey,
    enabled: !!bucketId && !!fileId,
    queryFn: ({ queryKey: [, , , bucketId, fileId] }) => {
      if (bucketId && fileId) {
        return storage.getFileDownloadURL(bucketId, fileId)
      }

      return null
    },

    gcTime: 0,
  })

  return queryResult
}