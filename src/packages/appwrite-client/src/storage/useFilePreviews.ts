'use client'

import { useQueries } from '@tanstack/react-query'
import { useAppwrite } from '../AppwriteProvider'
import type { Preview } from './types'

export type FilePreviewItem = {
  fileId: string
  preview?: Preview
}

/**
 * Get preview URLs for multiple files (e.g. image thumbnails in a gallery).
 * @param items Array of { bucketId, fileId, preview? }
 * @returns useQueries result: data is an array of URL | undefined (same order as items)
 * @link [Appwrite Documentation](https://appwrite.io/docs/client/storage?sdk=web-default#storageGetFilePreview)
 */
export function useFilePreviews(items: FilePreviewItem[], bucketId: string) {
  const { storage } = useAppwrite()

  const results = useQueries({
    queries: items.map(({ fileId, preview }) => ({
      queryKey: ['appwrite', 'storage', 'previews', bucketId, fileId] as const,
      queryFn: async () =>
        storage.getFilePreviewURL(
          bucketId,
          fileId,
          preview?.dimensions?.width,
          preview?.dimensions?.height,
          preview?.gravity,
          preview?.quality,
          preview?.border?.width,
          preview?.border?.color,
          preview?.border?.radius,
          preview?.opacity,
          preview?.rotation,
          preview?.background,
          preview?.output
        ),
      enabled: !!bucketId && !!fileId,
      gcTime: 0,
    })),
  })

  const data = results.map((r) => r.data)
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
