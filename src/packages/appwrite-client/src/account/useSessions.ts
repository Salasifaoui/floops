'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import type { Models } from 'appwrite'
import { useAppwrite } from '../AppwriteProvider'
import { useAccount } from './useAccount'

/**
 * Access to all active sessions for the current user's account.
 * @link [Appwrite Documentation](https://appwrite.io/docs/client/account?sdk=web-default#accountListSessions)
 */
export function useSessions() {
  const { account } = useAppwrite()
  const { data: accountData } = useAccount({})
  const queryClient = useQueryClient()
  const queryKey = useMemo(() => ['appwrite', 'account', 'sessions'], [])

  const queryResult = useQuery({
    enabled: !!accountData,
    queryKey,
    queryFn: async () => {
      const response = await account.listSessions()
      return response.sessions
    },
  })

  useEffect(() => {
    if (!accountData) return

    const unsubscribe = account.client.subscribe('account', (response) => {
      // Invalidate sessions when account changes
      if (response.events.some(event => event.includes('session'))) {
        queryClient.invalidateQueries({ queryKey })
      }
    })

    return () => unsubscribe?.()
  }, [account, accountData, queryClient, queryKey])

  return queryResult
}

