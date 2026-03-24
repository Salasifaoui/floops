'use client'

import { useAppwrite } from '../AppwriteProvider'
import { MutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { Models } from 'appwrite'

type TRequest = {
  password: string
  oldPassword?: string
}

/**
 * Update current user's password.
 * @link [Appwrite Documentation](https://appwrite.io/docs/client/account?sdk=web-default#accountUpdatePassword)
 */
function useUpdatePassword(props?: MutationOptions<Models.User<any>, unknown, TRequest, unknown>) {
  const { account } = useAppwrite()
  const queryClient = useQueryClient()

  const mutation = useMutation<Models.User<any>, unknown, TRequest, unknown>({
    ...props,
    mutationFn: async request => {
      return await account.updatePassword({ password: request.password, oldPassword: request.oldPassword })
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

export { useUpdatePassword }
