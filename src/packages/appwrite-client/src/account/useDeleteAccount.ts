'use client';

import { MutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppwrite } from '../AppwriteProvider';

export function useDeleteAccount(props: MutationOptions<{}, unknown, void, unknown>) {
  const { client } = useAppwrite();
  const queryClient = useQueryClient();
  const mutation = useMutation<{}, unknown, void, unknown>({
    ...props,
    mutationFn: async () => {
      // Use type assertion to access the delete method
      // The delete method exists in Appwrite but may not be in TypeScript definitions
      return client.call('DELETE', new URL(`/v1/account`, client.config.endpoint), {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      });
    },

    onSuccess: async (...args) => {
      // Clear all cached data after account deletion
      queryClient.clear();
      props.onSuccess?.(...args);
    },
  });

  return mutation;
}
