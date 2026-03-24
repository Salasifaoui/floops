export type StorageFileOperation =
  | 'create'
  | 'update'
  | 'delete'



export declare enum ImageGravity {
  Center = "center",
  TopLeft = "top-left",
  Top = "top",
  TopRight = "top-right",
  Left = "left",
  Right = "right",
  BottomLeft = "bottom-left",
  Bottom = "bottom",
  BottomRight = "bottom-right"
}

export type PreviewCropGravity = typeof ImageGravity[keyof typeof ImageGravity]

export declare enum ImageFormat {
  Jpg = "jpg",
  Jpeg = "jpeg",
  Png = "png",
  Webp = "webp",
  Heic = "heic",
  Avif = "avif",
  Gif = "gif"
}

export type PreviewOutputFormat = typeof ImageFormat[keyof typeof ImageFormat]

export type Preview = {
  gravity?: PreviewCropGravity,
  quality?: number,
  opacity?: number,
  rotation?: number,
  background?: string,
  output?: PreviewOutputFormat,
  border?: PreviewBorder,
  dimensions?: PreviewDimensions,
}

export type PreviewBorder = {
  color?: string,
  radius?: number,
  width?: number,
}

export type PreviewDimensions = {
  width?: number,
  height?: number,
}