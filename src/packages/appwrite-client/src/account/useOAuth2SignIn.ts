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
 * Create OAuth2 session for web.
 * It creates OAuth2 token URL then redirects browser to provider auth page.
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

      const loginUrl = await account.createOAuth2Token({
        provider: request.provider as unknown as OAuthProvider,
        success: redirectUrl,
        failure: failureUrl,
        scopes: request.scopes,
      } as any)

      window.location.assign(String(loginUrl))
    },
    onSuccess: async (...args) => {
      queryClient.setQueryData(['appwrite', 'account'], await account.get())
      props?.onSuccess?.(...args)
    },
  })

  return mutation
}

export { useOAuth2SignIn }
