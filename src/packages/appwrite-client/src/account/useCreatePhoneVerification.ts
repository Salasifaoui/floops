'use client'

import { MutationOptions, useMutation } from '@tanstack/react-query'
import { Models } from 'appwrite'
import { useAppwrite } from '../AppwriteProvider'

/**
 * Send phone verification SMS to current user.
 * @link [Appwrite Documentation](https://appwrite.io/docs/client/account?sdk=web-default#accountCreatePhoneVerification)
 */
function useCreatePhoneVerification(props?: MutationOptions<Models.Token, unknown, void, unknown>) {
  const { account } = useAppwrite()

  const mutation = useMutation<Models.Token, unknown, void, unknown>({
    ...props,
    mutationFn: async () => {
      return await account.createPhoneVerification()
    },
  })

  return mutation
}

export { useCreatePhoneVerification }
