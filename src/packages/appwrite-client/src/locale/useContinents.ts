'use client'

import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { Models } from 'appwrite'
import { useAppwrite } from '../AppwriteProvider'

const queryKey = ['appwrite', 'locale', 'continents']

/**
 * Access to a list of all continents.
 * @param options Options to pass to `react-query`.
 * @link [Appwrite Documentation](https://appwrite.io/docs/client/locale?sdk=web-default#localeListContinents)
 */
export function useContinents({
  ...options
}: Partial<UseQueryOptions<Models.Continent[], unknown, Models.Continent[], string[]>> = {}) {
  const { locale } = useAppwrite()
  const queryResult = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await locale.listContinents()

      return response.continents
    },

    gcTime: Infinity,

    ...options,
  })

  return queryResult
}