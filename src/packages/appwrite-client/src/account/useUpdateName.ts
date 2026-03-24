'use client'

import { MutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { Models } from 'appwrite'
import { useAppwrite } from '../AppwriteProvider'

type TRequest = {
  name: string
}

/**
 * Update current user's name.
 * @link [Appwrite Documentation](https://appwrite.io/docs/client/account?sdk=web-default#accountUpdateName)
 */
function useUpdateName(props?: MutationOptions<Models.User<any>, unknown, TRequest, unknown>) {
  const { account } = useAppwrite()
  const queryClient = useQueryClient()

  const mutation = useMutation<Models.User<any>, unknown, TRequest, unknown>({
    ...props,
    mutationFn: async request => {
      return await account.updateName({ name: request.name })
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

export { useUpdateName }
