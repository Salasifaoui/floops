'use client'

import { MutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { Models } from 'appwrite'
import { useAppwrite } from '../AppwriteProvider'

type TRequest = {
  userId: string
  secret: string
}

/**
 * Create a session from a token (phone OTP, magic URL, email OTP).
 * @link https://appwrite.io/docs/client/account#accountCreateSession
 */
function useCreateTokenSession(props?: MutationOptions<Models.Session, unknown, TRequest, unknown>) {
  const { account } = useAppwrite()
  const queryClient = useQueryClient()

  const mutation = useMutation<Models.Session, unknown, TRequest, unknown>({
    ...props,
    mutationFn: async request => {
      return await account.createSession({ userId: request.userId, secret: request.secret } as any)
    },
    onSuccess: async (...args) => {
      queryClient.setQueryData(['appwrite', 'account'], await account.get())
      props?.onSuccess?.(...args)
    },
  })

  return mutation
}

export { useCreateTokenSession }


