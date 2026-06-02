'use client'

import { MutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { OAuthProvider } from 'appwrite'
import { useAppwrite } from '../AppwriteProvider'
import { OAuth2Provider } from './types'

type TRequest = {
  provider: OAuth2Provider
  success?: string
  failure?: string
  scopes?: string[]
}

/**
 * Start OAuth2 sign-in/sign-up on web.
 * In the browser the Appwrite SDK redirects automatically; non-browser runtimes get a URL string.
 * @link [Appwrite Documentation](https://appwrite.io/docs/products/auth/oauth2)
 */
function useOAuth2SignIn(props?: MutationOptions<void, unknown, TRequest, unknown>) {
  const { account } = useAppwrite()
  const queryClient = useQueryClient()

  const mutation = useMutation<void, unknown, TRequest, unknown>({
    ...props,
    mutationFn: async request => {
      const redirectUrl = request.success ?? `${window.location.origin}/`
      const failureUrl = request.failure ?? redirectUrl

      const loginUrl = account.createOAuth2Session({
        provider: request.provider as unknown as OAuthProvider,
        success: redirectUrl,
        failure: failureUrl,
        scopes: request.scopes,
      })

      if (typeof loginUrl === 'string') {
        window.location.assign(loginUrl)
      }
    },
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: ['appwrite', 'account'] })
      props?.onSuccess?.(...args)
    },
  })

  return mutation
}

export { useOAuth2SignIn }
