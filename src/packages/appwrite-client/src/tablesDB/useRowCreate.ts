import { useMutation } from '@tanstack/react-query'
import { ID, Models } from 'appwrite'
import { useAppwrite } from '../AppwriteProvider'

type Props<TRow> = {
  databaseId: string,
  tableId: string,
  rowId?: string,
  data: Models.Row & TRow,
  permissions?: string[],
}

/**
 * Creates a row in a table.
 * @link [Appwrite Documentation](https://appwrite.io/docs/client/databases?sdk=web-default#tablesDBCreateRow)
 */
export function useRowCreate<TRow extends Models.Row>() {
  const { tablesDB } = useAppwrite()
  const mutation = useMutation({
    mutationFn: async ({ databaseId, tableId, rowId, data, permissions }: Props<TRow>) => {
      return tablesDB.createRow({
        databaseId,
        tableId,
        rowId: rowId ?? ID.unique(),
        data,
        permissions
      })
    },
  })

  return mutation
}

