'use client'

import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { Models } from 'appwrite'
import { useAppwrite } from '../AppwriteProvider'

const queryKey = ['appwrite', 'locale', 'currencies']

/**
 * Access to a list of all currencies.
 * @param options Options to pass to `react-query`.
 * @link [Appwrite Documentation](https://appwrite.io/docs/client/locale?sdk=web-default#localeListCurrencies)
 */
export function useCurrencies({
  ...options
}: Partial<UseQueryOptions<Models.Currency[], unknown, Models.Currency[], string[]>> = {}) {
  const { locale } = useAppwrite()
  const queryResult = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await locale.listCurrencies()

      return response.currencies
    },

    gcTime: Infinity,

    ...options,
  })

  return queryResult
}