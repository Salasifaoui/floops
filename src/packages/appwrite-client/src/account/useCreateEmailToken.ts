'use client'

import { MutationOptions, useMutation } from '@tanstack/react-query'
import { Models } from 'appwrite'
import { useAppwrite } from '../AppwriteProvider'

type TRequest = {
  userId: string
  email: string
  phrase?: boolean
}

/**
 * Send OTP via email for verification.
 * The OTP will be sent to the user's email address and is valid for 15 minutes.
 * Can be used without an active session.
 * @link [Appwrite Documentation](https://appwrite.io/docs/references/cloud/client-web/account#createEmailToken)
 */
function useCreateEmailToken(props?: MutationOptions<Models.Token, unknown, TRequest, unknown>) {
  const { account } = useAppwrite()

  const mutation = useMutation<Models.Token, unknown, TRequest, unknown>({
    ...props,
    mutationFn: async request => {
      return await account.createEmailToken({
        userId: request.userId,
        email: request.email,
        phrase: request.phrase || false,
      })
    },
  })

  return mutation
}

export { useCreateEmailToken }

