'use client'

import { MutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Models } from 'appwrite'
import { useAppwrite } from '../AppwriteProvider'

type TRequest = {
  sessionId: string
}

/**
 * Delete a specific session by session ID.
 * @link [Appwrite Documentation](https://appwrite.io/docs/client/account?sdk=web-default#accountDeleteSession)
 */
function useDeleteSession(props?: MutationOptions<{}, unknown, TRequest, unknown>) {
  const { account } = useAppwrite()
  const queryClient = useQueryClient()

  const mutation = useMutation<{}, unknown, TRequest, unknown>({
    ...props,
    mutationFn: async request => {
      return await account.deleteSession({ sessionId: request.sessionId })
    },

    onSuccess: async (...args) => {
      // Invalidate sessions query to refetch the list
      queryClient.invalidateQueries({ queryKey: ['appwrite', 'account', 'sessions'] })
      props?.onSuccess?.(...args)
    },
  })

  return mutation
}

export { useDeleteSession }

