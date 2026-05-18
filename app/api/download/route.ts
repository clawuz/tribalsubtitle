export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getStorage } from '@/lib/firebase-admin'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 })

    const bucket = getStorage()
    const file = bucket.file(`renders/${id}.mp4`)
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000,
    })
    return NextResponse.json({ url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'İndirme hatası'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
