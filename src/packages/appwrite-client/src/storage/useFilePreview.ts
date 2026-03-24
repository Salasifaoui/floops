'use client'

import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useAppwrite } from '../AppwriteProvider'
import type { Preview } from './types'

/**
 * Get a file preview image.
 * @param bucketId Storage bucket unique ID
 * @param fileId  File ID
 * @param preview Options for cutting and resizing your preview image.
 * @param options Options to pass to `react-query`
 * @link [Appwrite Documentation](https://appwrite.io/docs/client/storage?sdk=web-default#storageGetFilePreview)
 */
export function useFilePreview({
  bucketId,
  fileId,
  preview,
  ...options
}: {
  bucketId: string
  fileId: string
  preview?: Preview
} & UseQueryOptions<URL, unknown, URL, string[]>) {
  const { storage } = useAppwrite()
  const queryKey = useMemo(() => ['appwrite', 'storage', 'previews', bucketId, fileId], [bucketId, fileId])
  const queryResult = useQuery({
    ...options,
    queryKey,
    queryFn: async ({ queryKey: [, , , bucketId, fileId] }) => {
      return storage.getFilePreviewURL(
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
      )
    },
    gcTime: 0,
  })

  return queryResult
}