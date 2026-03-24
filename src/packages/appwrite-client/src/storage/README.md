# Storage Hooks

## useBucket

```tsx
import { useBucket } from 'react-appwrite/storage'
import { Query } from 'appwrite'

function UploadedImagesList() {
  const bucketId = 'myBucket'
  
  const { data: uploadedImages } = useBucket(bucketId, [
    Query.orderDesc('$updatedAt')
  ])
  
  return (
    <ol>
      {
        uploadedImages?.map(image => (
          <li
            key={image.$id}
          >
            {image.name}
          </li>
        ))
      }
    </ol>
  )
}
```

## useFile

```tsx
import { useFile } from 'react-appwrite/storage'

function FileLabel() {
  const bucketId = 'photos'
  const fileId = 'headshot.png'

  const { data: file, isLoading } = useFile(bucketId, fileId)

  if (file) {
    return (
      <span>
        {file.name} - {file.sizeOriginal}
      </span>
    )
  }

  return (
    <span>
      Loading
    </span>
  )
}
```

---

## useFileDelete

```tsx
import { useFileDelete } from 'react-appwrite/storage'

function PhotoDeleteButton() {
  const bucketId = 'photos'
  const fileId = 'headshot.png'
  const deleteFile = useFileDelete()

  return (
    <button
      type="button"
      onClick={() => deleteFile.mutate({
        bucketId,
        fileId,
      })
    >
      Delete
    </button>
  )
}
```

---

## useFileUpdate

```typescript
import { useFileUpdate } from 'react-appwrite/storage'

// In your component.
const updateFile = useFileUpdate()

updateFile.mutateAsync({
  bucketId,
  fileId,
  permissions,
})
```

---

## useFileUpload

```tsx
import { useFileUpload } from 'react-appwrite/storage'

function ImageUploader() {
  const bucketId = 'photos'
  const upload = useFileUpload()

  return (
    <form>
      <input
        type="file"
        onChange={event => {
          const file = event.target?.files?.[0]

          if (file) {
            upload.mutate({
              bucketId,
              file,
            })
          }
        }}
      />
    </form>
  )
}
```

---

## useFileDownload

```tsx
import { useFileDownload } from 'react-appwrite/storage'

function DownloadButton() {
  const bucketId = 'photos'
  const fileId = 'headshot.png'
  const { data: download } = useFileDownload(bucketId, fileId)

  return (
    <a
      download
      href={download?.href}
    >
      Download
    </a>
  )
}
```

---

## useFileView

```tsx
import { useFileView } from 'react-appwrite/storage'

function OpenImageButton() {
  const bucketId = 'photos'
  const fileId = 'headshot.png'
  const { data: view } = useFileView(bucketId, fileId)

  return (
    <a
      href={view?.href}
    >
      Open Image
    </a>
  )
}
```

---

## useFilePreview

```tsx
import { useFilePreview } from 'react-appwrite/storage'

function FilePreview() {
  const bucketId = 'photos'
  const fileId = 'headshot.png'
  const { data: preview } = useFilePreview(bucketId, fileId, {
    dimensions: {
      width: 100,
      height: 100,
    }
  })

  if (preview) {
    return (
      <Image
        width={100}
        height={100}
        src={preview?.href}
        alt="Preview Image"
      />
    )
  }

  return (
    <span>
      No preview available
    </span>
  )
}
```

---

## useFilePreviews

Get preview URLs for multiple files (e.g. image thumbnails in a gallery).

```tsx
import { useFilePreviews } from 'react-appwrite/storage'

function ImageGallery({ fileIds }: { fileIds: string[] }) {
  const bucketId = 'photos'
  const items = fileIds.map((fileId) => ({ bucketId, fileId }))
  const { data: previews, isLoading } = useFilePreviews(items)

  if (isLoading) return <span>Loading…</span>

  return (
    <div className="grid grid-cols-3 gap-2">
      {previews?.map((href, i) =>
        href ? (
          <img key={fileIds[i]} src={href.href} alt="" width={100} height={100} />
        ) : null
      )}
    </div>
  )
}
```

With shared preview dimensions:

```tsx
const items = fileIds.map((fileId) => ({
  bucketId: 'photos',
  fileId,
  preview: { dimensions: { width: 200, height: 200 } },
}))
const { data: previews } = useFilePreviews(items)
```

---

## useFileViews

Get view URLs for multiple files (same order as input).

```tsx
import { useFileViews } from 'react-appwrite/storage'

function MultipleImageLinks({ items }: { items: { bucketId: string; fileId: string }[] }) {
  const { data: viewUrls, isLoading } = useFileViews(items)

  return (
    <ul>
      {viewUrls?.map((url, i) => (
        <li key={items[i].fileId}>
          <a href={url?.href ?? '#'}>Open {items[i].fileId}</a>
        </li>
      ))}
    </ul>
  )
}
```

---

## useFilesUpload

Upload multiple files in one mutation (e.g. gallery upload).

```tsx
import { useFilesUpload } from 'react-appwrite/storage'

function MultipleImageUploader() {
  const bucketId = 'photos'
  const upload = useFilesUpload()

  return (
    <input
      type="file"
      multiple
      accept="image/*"
      onChange={(e) => {
        const files = e.target?.files
        if (files?.length) {
          upload.mutate({
            bucketId,
            files: Array.from(files),
          })
        }
      }}
    />
  )
}
```

Optional `fileIds` to set custom IDs (same order as `files`):

```tsx
upload.mutate({
  bucketId: 'photos',
  files: Array.from(fileList),
  fileIds: ['id1', 'id2', 'id3'],
  permissions: ['read("any")'],
})
```
```