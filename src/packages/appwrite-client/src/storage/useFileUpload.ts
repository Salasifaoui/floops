import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ID } from 'appwrite'
import { useAppwrite } from '../AppwriteProvider'

type Props = {
  bucketId: string,
  fileId?: string,
  file: File | any,
  permissions?: string[],
}

/**
 * Upload a file to a bucket.
 * @link [Appwrite Documentation](https://appwrite.io/docs/client/storage?sdk=web-default#storageCreateFile)
 */
export function useFileUpload(props = {}) {
  const { storage } = useAppwrite()
  const queryClient = useQueryClient()
  const mutation = useMutation({
    ...props,
    mutationFn: async ({ bucketId, fileId, file, permissions }: Props) => {
      console.log("-----------")
      console.log('mutationFn', JSON.stringify({ bucketId, fileId, file, permissions }, null, 2))
      return await storage.createFile({
        bucketId,
        fileId: fileId ?? ID.unique(),
        file,
        permissions,
        onProgress: (progress) => {
          console.log("-----------")
          console.log('progress', JSON.stringify(progress, null, 2))
        }
      })
    },

    onSuccess: async (file, { bucketId, fileId }) => {
      queryClient.setQueryData(['appwrite', 'storage', 'files', bucketId, fileId], file)
      props.onSuccess?.(file, { bucketId, fileId })
    },
  })

  return mutation
}