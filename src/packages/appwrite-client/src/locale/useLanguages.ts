'use client'

import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { Models } from 'appwrite'
import { useAppwrite } from '../AppwriteProvider'

const queryKey = ['appwrite', 'locale', 'languages']

/**
 * Access to a list of all languages.
 * @param options Options to pass to `react-query`.
 * @link [Appwrite Documentation](https://appwrite.io/docs/client/locale?sdk=web-default#localeListLanguages)
 */
export function useLanguages({
  ...options
}: Partial<UseQueryOptions<Models.Language[], unknown, Models.Language[], string[]>> = {}) {
  const { locale } = useAppwrite()
  const queryResult = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await locale.listLanguages()

      return response.languages
    },

    gcTime: Infinity,

    ...options,
  })

  return queryResult
}