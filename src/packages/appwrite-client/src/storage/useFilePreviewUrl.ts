'use client'

import { useAppwrite } from '../AppwriteProvider'
import { Client, ImageFormat, ImageGravity, Payload } from 'appwrite';
import { useMemo } from 'react'

export class Service {
  static CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

  client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  static flatten(data: Payload, prefix = ''): Payload {
    let output: Payload = {};

    for (const [key, value] of Object.entries(data)) {
      let finalKey = prefix ? prefix + '[' + key + ']' : key;
      if (Array.isArray(value)) {
        output = { ...output, ...Service.flatten(value, finalKey) };
      } else {
        output[finalKey] = value;
      }
    }

    return output;
  }
}

/**
 * Get a file preview image.
 * @param bucketId Storage bucket unique ID
 * @param fileId  File ID
 * @link [Appwrite Documentation](https://appwrite.io/docs/client/storage?sdk=web-default#storageGetFilePreview)
 */
export function useFilePreviewUrl({
  bucketId,
  fileId,
}: {
  bucketId: string;
  fileId?: string;
}) {
  const { client } = useAppwrite()

  const filePreviewUrl = useMemo(() => {
    if (!fileId) return null;
    return getFilePreviewURL(client, bucketId, fileId)
    // return storage.getFilePreviewURL(bucketId, fileId)
  }, [bucketId, fileId]);

  return {
    filePreviewUrl,
  }
}

/**
 * SRC: https://github.com/appwrite/sdk-for-react-native/blob/main/src/services/storage.ts#L515
 * Get a file preview image. Currently, this method supports preview for image
 * files (jpg, png, and gif), other supported formats, like pdf, docs, slides,
 * and spreadsheets, will return the file icon image. You can also pass query
 * string arguments for cutting and resizing your preview image. Preview is
 * supported only for image files smaller than 10MB.
 *
 * @param {string} bucketId
 * @param {string} fileId
 * @param {number} width
 * @param {number} height
 * @param {ImageGravity} gravity
 * @param {number} quality
 * @param {number} borderWidth
 * @param {string} borderColor
 * @param {number} borderRadius
 * @param {number} opacity
 * @param {number} rotation
 * @param {string} background
 * @param {ImageFormat} output
 * @param {string} token
 * @throws {AppwriteException}
 * @returns {URL}
*/
function getFilePreviewURL(client: Client, bucketId: string, fileId: string, width?: number, height?: number, gravity?: ImageGravity, quality?: number, borderWidth?: number, borderColor?: string, borderRadius?: number, opacity?: number, rotation?: number, background?: string, output?: ImageFormat, token?: string): URL {
  const apiPath = '/storage/buckets/{bucketId}/files/{fileId}/preview'.replace('{bucketId}', bucketId).replace('{fileId}', fileId);
  const payload: Payload = {};

  if (typeof width !== 'undefined') {
    payload['width'] = width;
  }

  if (typeof height !== 'undefined') {
    payload['height'] = height;
  }

  if (typeof gravity !== 'undefined') {
    payload['gravity'] = gravity;
  }

  if (typeof quality !== 'undefined') {
    payload['quality'] = quality;
  }

  if (typeof borderWidth !== 'undefined') {
    payload['borderWidth'] = borderWidth;
  }

  if (typeof borderColor !== 'undefined') {
    payload['borderColor'] = borderColor;
  }

  if (typeof borderRadius !== 'undefined') {
    payload['borderRadius'] = borderRadius;
  }

  if (typeof opacity !== 'undefined') {
    payload['opacity'] = opacity;
  }

  if (typeof rotation !== 'undefined') {
    payload['rotation'] = rotation;
  }

  if (typeof background !== 'undefined') {
    payload['background'] = background;
  }

  if (typeof output !== 'undefined') {
    payload['output'] = output;
  }

  if (typeof token !== 'undefined') {
    payload['token'] = token;
  }

  const uri = new URL(client.config.endpoint + apiPath);
  payload['project'] = client.config.project;

  for (const [key, value] of Object.entries(Service.flatten(payload))) {
    uri.searchParams.append(key, value);
  }

  return uri;
}