import { useMutation } from '@tanstack/react-query'
import { useAppwrite } from '../AppwriteProvider'

type Props = {
  databaseId: string,
  tableId: string,
  rowId: string,
}

/**
 * Deletes a row from a table.
 * @link [Appwrite Documentation](https://appwrite.io/docs/client/databases?sdk=web-default#tablesDBDeleteRow)
 */
export function useRowDelete() {
  const { tablesDB } = useAppwrite()
  const mutation = useMutation({
    mutationFn: async ({ databaseId, tableId, rowId }: Props) => {
      return tablesDB.deleteRow({
        databaseId,
        tableId,
        rowId
      })
    },
  })

  return mutation
}

