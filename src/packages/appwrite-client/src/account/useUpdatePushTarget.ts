'use client'

import { MutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { Models } from 'appwrite'
import { useAppwrite } from '../AppwriteProvider'

type TRequest = {
  targetId: string
  identifier: string
}

/**
 * Update a push notification target for the current account.
 * @link [Appwrite Documentation](https://appwrite.io/docs/client/account?sdk=web-default#accountUpdatePushTarget)
 */
function useUpdatePushTarget(props?: MutationOptions<Models.Target, unknown, TRequest, unknown>) {
  const { account } = useAppwrite()
  const queryClient = useQueryClient()

  const mutation = useMutation<Models.Target, unknown, TRequest, unknown>({
    ...props,
    mutationFn: async request => {
      return await account.updatePushTarget({
        targetId: request.targetId,
        identifier: request.identifier,
      })
    },

    onSuccess: async (...args) => {
      const data = args[0] as Models.Target
      // Invalidate account to refresh targets if needed
      queryClient.invalidateQueries({ queryKey: ['appwrite', 'account'] })
      props?.onSuccess?.(...args)
    },
  })

  return mutation
}

export { useUpdatePushTarget }

