import { randomUUID } from 'crypto'
import { getStorage } from './firebase-admin'
import fs from 'fs'

export async function uploadFile(localPath: string, ext: 'png' | 'mp4'): Promise<string> {
  const id = randomUUID()
  const destPath = `renders/${id}.${ext}`
  const bucket = getStorage()
  await bucket.upload(localPath, {
    destination: destPath,
    metadata: { contentType: ext === 'png' ? 'image/png' : 'video/mp4' },
  })
  return id
}

export async function getSignedUrl(id: string, ext: 'png' | 'mp4'): Promise<string> {
  const bucket = getStorage()
  const file = bucket.file(`renders/${id}.${ext}`)
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 60 * 60 * 1000,
  })
  return url
}
