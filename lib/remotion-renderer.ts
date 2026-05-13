import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import path from 'path'
import os from 'os'
import fs from 'fs'
import { randomUUID } from 'crypto'

let bundled: string | null = null

async function getBundle(): Promise<string> {
  if (bundled) return bundled
  bundled = await bundle({
    entryPoint: path.resolve(process.cwd(), 'remotion/index.ts'),
    webpackOverride: (config) => config,
  })
  return bundled
}

// Remotion bundle farklı bir temp dizinde çalışıyor.
// public/uploads/ dosyalarını bundle'ın uploads/ klasörüne kopyala.
function copyMediaToBundle(bundleDir: string, mediaUrl: string): void {
  if (!mediaUrl || /^(https?:|data:|blob:)/.test(mediaUrl)) return
  const normalized = mediaUrl.startsWith('/') ? mediaUrl.slice(1) : mediaUrl
  const srcPath = path.join(process.cwd(), 'public', normalized)
  if (!fs.existsSync(srcPath)) return
  const destDir = path.join(bundleDir, 'uploads')
  fs.mkdirSync(destDir, { recursive: true })
  const destPath = path.join(destDir, path.basename(srcPath))
  if (!fs.existsSync(destPath)) {
    fs.copyFileSync(srcPath, destPath)
  }
}

export async function renderSubtitleVideo(
  props: Record<string, unknown>,
): Promise<string> {
  const serveUrl = await getBundle()

  // Medya dosyalarını bundle dizinine kopyala
  if (typeof props.backgroundMedia === 'string') {
    copyMediaToBundle(serveUrl, props.backgroundMedia)
  }

  const composition = await selectComposition({
    serveUrl,
    id: 'Subtitle',
    inputProps: props,
  })

  const outPath = path.join(os.tmpdir(), `${randomUUID()}.mp4`)
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    outputLocation: outPath,
    inputProps: props,
    chromiumOptions: {
      disableWebSecurity: true,
    },
    concurrency: 1, // RAM tasarrufu için
  })
  return outPath
}
