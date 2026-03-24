'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import type { Models } from 'appwrite'
import { useAppwrite } from '../AppwriteProvider'
import { useAccount } from './useAccount'

/**
 * Access to all identities linked to the current user's account.
 * @link [Appwrite Documentation](https://appwrite.io/docs/client/account?sdk=web-default#accountListIdentities)
 */
export function useIdentities() {
  const { account } = useAppwrite()
  const { data: accountData } = useAccount({})
  const queryClient = useQueryClient()
  const queryKey = useMemo(() => ['appwrite', 'account', 'identities'], [])

  const queryResult = useQuery({
    enabled: !!accountData,
    queryKey,
    queryFn: async () => {
      const response = await account.listIdentities()
      return response.identities
    },
  })

  useEffect(() => {
    if (!accountData) return

    const unsubscribe = account.client.subscribe('account', (response) => {
      // Invalidate identities when account changes
      if (response.events.some(event => event.includes('identity'))) {
        queryClient.invalidateQueries({ queryKey })
      }
    })

    return () => unsubscribe?.()
  }, [account, accountData, queryClient, queryKey])

  return queryResult
}

