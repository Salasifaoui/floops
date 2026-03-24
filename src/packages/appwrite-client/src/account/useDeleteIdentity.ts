'use client'

import { MutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppwrite } from '../AppwriteProvider'

type TRequest = {
  identityId: string
}

/**
 * Delete an identity from the current user's account.
 * @link [Appwrite Documentation](https://appwrite.io/docs/client/account?sdk=web-default#accountDeleteIdentity)
 */
function useDeleteIdentity(props?: MutationOptions<{}, unknown, TRequest, unknown>) {
  const { account } = useAppwrite()
  const queryClient = useQueryClient()

  const mutation = useMutation<{}, unknown, TRequest, unknown>({
    ...props,
    mutationFn: async request => {
      return await account.deleteIdentity({ identityId: request.identityId })
    },

    onSuccess: async (...args) => {
      // Invalidate identities query to refetch the list
      queryClient.invalidateQueries({ queryKey: ['appwrite', 'account', 'identities'] })
      // Also invalidate account to ensure it's up to date
      queryClient.invalidateQueries({ queryKey: ['appwrite', 'account'] })
      props?.onSuccess?.(...args)
    },
  })

  return mutation
}

export { useDeleteIdentity }

