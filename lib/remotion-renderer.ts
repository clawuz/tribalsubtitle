import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import path from 'path'
import os from 'os'
import { randomUUID } from 'crypto'

let bundled: string | null = null

async function getBundle(): Promise<string> {
  if (bundled) return bundled
  console.log('[remotion] bundling...')
  bundled = await bundle({
    entryPoint: path.resolve(process.cwd(), 'remotion/index.ts'),
    webpackOverride: (config) => config,
  })
  console.log('[remotion] bundle ready:', bundled)
  return bundled
}

export async function renderSubtitleVideo(
  props: Record<string, unknown>,
): Promise<string> {
  const serveUrl = await getBundle()

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
    concurrency: os.cpus().length,
    chromiumOptions: {
      disableWebSecurity: true,
      gl: 'swangle',
      enableMultiProcessOnLinux: false,
    },
    timeoutInMilliseconds: 60000,
    imageFormat: 'jpeg',
    jpegQuality: 80,
  })
  return outPath
}
