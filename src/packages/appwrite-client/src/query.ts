import {
  QueryClient,
  type MutationObserverOptions,
  type QueryClientConfig,
} from '@tanstack/react-query'

export const defaultQueryOptions = {
  staleTime: 5 * 60 * 1000, // 5 minutes instead of Infinity to allow garbage collection
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  retry: false,
  gcTime: 10 * 60 * 1000, // 10 minutes garbage collection time
} as const

export const defaultMutationOptions: MutationObserverOptions<unknown, unknown, unknown, unknown> = {
  retry: false,
}

export const queryClientConfiguration: QueryClientConfig = {
  defaultOptions: {
    queries: defaultQueryOptions,
    mutations: defaultMutationOptions,
  },
}

export const queryClient = new QueryClient(queryClientConfiguration)