'use client'

import { MutationOptions, useMutation } from '@tanstack/react-query'
import { Models } from 'appwrite'
import { useAppwrite } from '../AppwriteProvider'

type TRequest = {
  url: string
}

/**
 * Send email verification to current user.
 * @link [Appwrite Documentation](https://appwrite.io/docs/client/account?sdk=web-default#accountCreateEmailVerification)
 */
function useCreateVerification(props?: MutationOptions<Models.Token, unknown, TRequest, unknown>) {
  const { account } = useAppwrite()

  const mutation = useMutation<Models.Token, unknown, TRequest, unknown>({
    ...props,
    mutationFn: async request => {
      const user = await account.get();
      const re = await account.createEmailToken({
        userId: user.$id,
        email: user.email,
        // phrase: 'request.phrase',
      })
      console.log('===========')
      console.log('===========')
      console.log('account.createEmailToke::: ', re)
      console.log('===========')
      return await account.createEmailVerification(request)
    },
  })

  return mutation
}

export { useCreateVerification }
