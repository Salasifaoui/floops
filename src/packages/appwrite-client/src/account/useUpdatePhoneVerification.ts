'use client'

import { useAppwrite } from '../AppwriteProvider'
import { MutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { Models } from 'appwrite'

type TRequest = {
  userId: string
  secret: string
}

/**
 * Complete phone verification process with OTP.
 * @link [Appwrite Documentation](https://appwrite.io/docs/client/account?sdk=web-default#accountUpdatePhoneVerification)
 */
function useUpdatePhoneVerification(props?: MutationOptions<Models.Token, unknown, TRequest, unknown>) {
  const { account } = useAppwrite()
  const queryClient = useQueryClient()

  const mutation = useMutation<Models.Token, unknown, TRequest, unknown>({
    ...props,
    mutationFn: async request => {
      return await account.updatePhoneVerification({ userId: request.userId, secret: request.secret } as any)
    },

    onSuccess: async (...args) => {      // Refresh the account data to update verification status
      queryClient.invalidateQueries({ queryKey: ['appwrite', 'account'] })
      props?.onSuccess?.(...args)
    },
  })

  return mutation
}

export { useUpdatePhoneVerification }
