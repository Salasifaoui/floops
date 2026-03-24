'use client'

import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useAppwrite } from '../AppwriteProvider'
import type { Avatar } from './types'

/**
 * Used to generate image URLs.
 * @param avatar The avatar to generate.
 * @param options Options to pass to `react-query`
 */
export function useAvatar({
  avatar,
  ...options
}: {
  avatar: Avatar
} & UseQueryOptions<URL, unknown, URL, (string | Avatar)[]>) {
  const { avatars } = useAppwrite()
  const queryKey = useMemo(() => ['appwrite', 'avatars', avatar], [avatar])
  const queryResult = useQuery({
    ...options,
    queryKey,
    queryFn: async () => {
      switch (avatar.type) {
        case 'initials':
          return avatars.getInitialsURL(
            avatar.name,
            avatar.dimensions?.width,
            avatar.dimensions?.height,
            avatar.background
          )
        case 'image':
          return avatars.getImageURL(
            avatar.url,
            avatar.dimensions?.width,
            avatar.dimensions?.height
          )
        case 'browser':
          return avatars.getBrowserURL(
            avatar.code as any,
            avatar.dimensions?.width,
            avatar.dimensions?.height,
            avatar.quality
          )
        case 'favicon':
          return avatars.getFaviconURL(avatar.url)
        case 'qr':
          return avatars.getQRURL(
            avatar.text,
            avatar.size,
            avatar.margin,
            avatar.download
          )
        case 'card':
          return avatars.getCreditCardURL(
            avatar.code as any,
            avatar.dimensions?.width,
            avatar.dimensions?.height,
            avatar.quality
          )
      }
    },

    gcTime: 0,
  })

  return queryResult
}