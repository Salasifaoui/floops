'use client'

import { MutationOptions, useMutation } from '@tanstack/react-query'
import { ID, Models } from 'appwrite'
import { useAppwrite } from '../AppwriteProvider'

type TRequest = {
  userId?: string
  phone: string
}

/**
 * Send phone OTP token (SMS) for login/registration.
 * @link https://appwrite.io/docs/client/account#accountCreatePhoneToken
 */
function useCreatePhoneToken(props?: MutationOptions<Models.Token, unknown, TRequest, unknown>) {
  const { account } = useAppwrite()

  const mutation = useMutation<Models.Token, unknown, TRequest, unknown>({
    ...props,
    mutationFn: async request => {
      return await account.createPhoneToken({
        userId: request.userId ?? ID.unique(),
        phone: request.phone,
      } as any)
    },
  })

  return mutation
}

export { useCreatePhoneToken }


