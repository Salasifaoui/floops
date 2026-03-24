'use client'

import { useAppwrite } from '../AppwriteProvider'
import { MutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { Models } from 'appwrite'

type TRequest = {
  email: string
  password: string
}

/**
 * Update current user's email address.
 * @link [Appwrite Documentation](https://appwrite.io/docs/client/account?sdk=web-default#accountUpdateEmail)
 */
function useUpdateEmail(props?: MutationOptions<Models.User<any>, unknown, TRequest, unknown>) {
  const { account } = useAppwrite()
  const queryClient = useQueryClient()

  const mutation = useMutation<Models.User<any>, unknown, TRequest, unknown>({
    ...props,
    mutationFn: async request => {
      return await account.updateEmail(request)
    },

    onSuccess: async (...args) => {
      const data = args[0] as Models.User<any>
      // Update the account cache
      queryClient.setQueryData(['appwrite', 'account'], data)
      props?.onSuccess?.(...args)
    },
  })

  return mutation
}

export { useUpdateEmail }
