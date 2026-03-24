'use client'

import { useQueries } from '@tanstack/react-query'
import { useAppwrite } from '../AppwriteProvider'

export type FileViewItem = {
  fileId: string
}

/**
 * Get view URLs for multiple files (e.g. multiple images for display or download links).
 * @param items Array of { bucketId, fileId }
 * @returns useQueries result: data is an array of URL | null | undefined (same order as items)
 * @link [Appwrite Documentation](https://appwrite.io/docs/client/storage?sdk=web-default#storageGetFileView)
 */
export function useFileViews(items: FileViewItem[], bucketId: string) {
  const { storage } = useAppwrite()

  const results = useQueries({
    queries: items.map(({ fileId }) => ({
      queryKey: ['appwrite', 'storage', 'downloads', bucketId, fileId] as const,
      queryFn: async () => storage.getFileView({ bucketId, fileId }),
      enabled: !!bucketId && !!fileId,
      gcTime: 0,
    })),
  })

  const data = results.map((r) => r.data ?? null)
  const isLoading = results.some((r) => r.isLoading)
  const isPending = results.some((r) => r.isPending)
  const isError = results.some((r) => r.isError)
  const error = results.find((r) => r.error)?.error

  return {
    data,
    results,
    isLoading,
    isPending,
    isError,
    error,
  }
}
