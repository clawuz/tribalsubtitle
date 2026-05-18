export const runtime = 'nodejs'
export const maxDuration = 120

import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import { randomUUID } from 'crypto'
import { getStorage } from '@/lib/firebase-admin'

const execFileAsync = promisify(execFile)

export async function POST(req: NextRequest) {
  const tmpPath = path.join(tmpdir(), randomUUID())
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'Dosya gerekli' }, { status: 400 })
    }

    const ext = path.extname(file.name).toLowerCase()
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.webm', '.mov']
    if (!allowed.includes(ext)) {
      return NextResponse.json({ error: 'Desteklenmeyen dosya tipi' }, { status: 400 })
    }

    const filename = `${randomUUID()}${ext}`
    const localTmp = `${tmpPath}${ext}`

    // Write to /tmp for ffprobe
    const bytes = await file.arrayBuffer()
    await writeFile(localTmp, Buffer.from(bytes))

    let durationSeconds: number | null = null
    if (['.mp4', '.webm', '.mov'].includes(ext)) {
      try {
        const { stdout } = await execFileAsync('ffprobe', [
          '-v', 'quiet',
          '-show_entries', 'format=duration',
          '-of', 'default=noprint_wrappers=1:nokey=1',
          localTmp,
        ])
        const parsed = parseFloat(stdout.trim())
        if (!isNaN(parsed)) durationSeconds = Math.ceil(parsed)
      } catch {
        // ffprobe unavailable — client-side fallback
      }
    }

    // Upload to Firebase Storage
    const bucket = getStorage()
    await bucket.upload(localTmp, {
      destination: `uploads/${filename}`,
      metadata: { contentType: file.type || 'application/octet-stream' },
    })

    // Signed URL valid for 7 days
    const [signedUrl] = await bucket.file(`uploads/${filename}`).getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    })

    return NextResponse.json({ url: signedUrl, remotionUrl: signedUrl, durationSeconds })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Yükleme hatası'
    return NextResponse.json({ error: message }, { status: 500 })
  } finally {
    // Clean up /tmp
    for (const ext of ['.mp4', '.webm', '.mov', '.jpg', '.jpeg', '.png', '.webp', '.gif', '']) {
      try { await unlink(`${tmpPath}${ext}`) } catch { /* ignore */ }
    }
  }
}
