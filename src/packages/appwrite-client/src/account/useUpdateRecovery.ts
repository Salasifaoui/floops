'use client'

import { MutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { Models } from 'appwrite'
import { useAppwrite } from '../AppwriteProvider'

type TRequest = {
  userId: string
  secret: string
  password: string
}

/**
 * Complete password recovery.
 * @link [Appwrite Documentation](https://appwrite.io/docs/client/account?sdk=web-default#accountUpdateRecovery)
 */
function useUpdateRecovery(props?: MutationOptions<Models.Token, unknown, TRequest, unknown>) {
  const { account } = useAppwrite()
  const queryClient = useQueryClient()

  const mutation = useMutation<Models.Token, unknown, TRequest, unknown>({
    ...props,
    mutationFn: async request => {
      return await account.updateRecovery({ userId: request.userId, secret: request.secret, password: request.password } as any)
    },

    onSuccess: async (...args) => {
      // Clear account cache since password has been updated
      queryClient.invalidateQueries({ queryKey: ['appwrite', 'account'] })
      props?.onSuccess?.(...args)
    },
  })

  return mutation
}

export { useUpdateRecovery }
