'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ID } from 'appwrite'
import { useAppwrite } from '../AppwriteProvider'
import type { Models } from 'appwrite'

type FileInput = File | { uri: string; name: string; type?: string }

type Props = {
  bucketId: string
  files: FileInput[]
  fileIds?: string[]
  permissions?: string[]
}

/**
 * Upload multiple files to a bucket (e.g. multiple images for a gallery).
 * @link [Appwrite Documentation](https://appwrite.io/docs/client/storage?sdk=web-default#storageCreateFile)
 */
export function useFilesUpload(props = {}) {
  const { storage } = useAppwrite()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    ...props,
    mutationFn: async ({ bucketId, files, fileIds, permissions }: Props): Promise<Models.File[]> => {
      const ids = fileIds ?? files.map(() => ID.unique())
      const results = await Promise.all(
        files.map((file, index) =>
          storage.createFile({
            bucketId,
            fileId: ids[index] ?? ID.unique(),
            file: file as { name: string; type: string; size: number; uri: string },
            permissions,
          })
        )
      )
      return results
    },
    onSuccess: (files, { bucketId }) => {
      files.forEach((file) => {
        queryClient.setQueryData(
          ['appwrite', 'storage', 'files', bucketId, file.$id],
          file
        )
      })
      props.onSuccess?.(files, { bucketId })
    },
  })

  return mutation
}
