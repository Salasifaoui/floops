'use client'

import { useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query'
import { produce } from 'immer'
import { useEffect } from 'react'
import type { Models } from 'appwrite'
import { useAppwrite } from '../AppwriteProvider'

/**
 * Access to the local user's account.
 * @param account The initial account object, obtained from SSR.
 * @param options Options to pass to `react-query`
 */
export function useAccount<Preferences extends Models.Preferences>({
  account,
  ...options
}: {
  account?: Models.User<Preferences>
} & Partial<UseQueryOptions<Models.User<Preferences>, unknown, Models.User<Preferences>, string[]>>) {
  const { account: accountService } = useAppwrite()
  const queryClient = useQueryClient()

  const queryResult = useQuery({
    queryKey: ['appwrite', 'account'],
    queryFn: () => accountService.get<Preferences>(),

    // Should be initialData, but it's causing problems with SSR.
    placeholderData: account,

    ...options,
  })

  useEffect(() => {
    const unsubscribe = accountService.client.subscribe('account', response => {
      const isUpdatingPreferences = response.events.some(event => event.endsWith('prefs'))

      if (isUpdatingPreferences) {
        queryClient.setQueryData<Models.User<Preferences>>(['appwrite', 'account'], account => produce(account, draft => {
          if (draft) {
            draft.prefs = response.payload as any
          }
        }))

        return
      }

      queryClient.setQueryData(['appwrite', 'account'], response.payload)
    })

    return () => unsubscribe?.()
  }, [accountService, queryClient])

  return queryResult
}