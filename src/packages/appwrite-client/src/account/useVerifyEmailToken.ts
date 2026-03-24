'use client'

import { MutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { Models } from 'appwrite'
import { useAppwrite } from '../AppwriteProvider'

type TRequest = {
  userId: string
  secret: string
}

type TContext = {
  sessionData?: {
    session: Models.Session
    user: Models.User<Models.Preferences>
  }
}

/**
 * Verify email OTP by creating a session with the token.
 * This completes the email verification process and creates an authenticated session.
 * @link [Appwrite Documentation](https://appwrite.io/docs/references/cloud/client-web/account#createSession)
 */
function useVerifyEmailToken(props?: MutationOptions<Models.Session, unknown, TRequest, TContext>) {
  const { account } = useAppwrite()
  const queryClient = useQueryClient()

  const mutation = useMutation<Models.Session, unknown, TRequest, TContext>({
    ...props,
    mutationFn: async request => {
      // Create session with OTP token
      const session = await account.createSession({
        userId: request.userId,
        secret: request.secret,
      })
      
      return session
    },

    onSuccess: async (...args) => {
      // Refresh the account data to update verification status
      queryClient.invalidateQueries({ queryKey: ['appwrite', 'account'] })
      props?.onSuccess?.(...args)
    },
  })

  return mutation
}

export { useVerifyEmailToken }

