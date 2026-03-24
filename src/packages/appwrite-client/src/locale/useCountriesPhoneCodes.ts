'use client'

import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { Models } from 'appwrite'
import { useAppwrite } from '../AppwriteProvider'

const queryKey = ['appwrite', 'locale', 'countries', 'phones']

/**
 * Access to a list of all countries' phone codes.
 * @param options Options to pass to `react-query`.
 * @link [Appwrite Documentation](https://appwrite.io/docs/client/locale?sdk=web-default#localeListCountriesPhones)
 */
export function useCountriesPhoneCodes({
  ...options
}: Partial<UseQueryOptions<Models.Phone[], unknown, Models.Phone[], string[]>> = {}) {
  const { locale } = useAppwrite()
  const queryResult = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await locale.listCountriesPhones()

      return response.phones
    },

    gcTime: Infinity,

    ...options,
  })

  return queryResult
}