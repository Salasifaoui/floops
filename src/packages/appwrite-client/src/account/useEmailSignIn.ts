'use client'

import { MutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { Models } from 'appwrite'
import { useAppwrite } from '../AppwriteProvider'

type TRequest = {
  email: string,
  password: string,
}
/**
 * Create email session.
 * @link [Appwrite Documentation](https://appwrite.io/docs/client/account?sdk=web-default#accountCreateEmailSession) 
 */
function useEmailSignIn(props: MutationOptions<Models.Session, unknown, TRequest, unknown>) {
  const { account } = useAppwrite()
  const queryClient = useQueryClient()
  const mutation = useMutation<Models.Session, unknown, TRequest, unknown>({
    ...props,
    mutationFn: async request => {
      return await account.createEmailPasswordSession(request)
    },

    onSuccess: async (...args) => {
      queryClient.setQueryData(['appwrite', 'account'], await account.get())
      props.onSuccess?.(...args)
    },
  })

  return mutation
}

export { useEmailSignIn }
