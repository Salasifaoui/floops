import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppwrite } from '../AppwriteProvider'
import { Models } from 'appwrite'

type Props<TRow> = {
  databaseId: string,
  tableId: string,
  rowId: string,
  data: Partial<TRow>,
  permissions?: string[],
}

/**
 * Updates a row in a table.
 * Invalidates all cached queries for this row so that useRow (including with select/relations) refetches.
 * @link [Appwrite Documentation](https://appwrite.io/docs/client/databases?sdk=web-default#tablesDBUpdateRow)
 */
export function useRowUpdate<TRow extends Models.Row>() {
  const { tablesDB } = useAppwrite()
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async ({ databaseId, tableId, rowId, data, permissions }: Props<TRow>) => {
      return tablesDB.updateRow<TRow>({
        databaseId,
        tableId,
        rowId,
        data: data as any,
        permissions
      })
    },
    onSuccess: (_data, { databaseId, tableId }) => {
      // Invalidate all caches for this table: single-row (detail/edit) and list (VehicleScreen, ServicesScreen, etc.)
      // so that useRow and useRows refetch with correct relation selects (store.*, driver.*).
      queryClient.invalidateQueries({
        queryKey: ['appwrite', 'databases', databaseId, tableId],
      })
    },
  })

  return mutation
}

