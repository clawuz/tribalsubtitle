import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import path from 'path'
import os from 'os'
import { randomUUID } from 'crypto'

// Start bundling immediately at module load so it's ready before the first request
const bundlePromise: Promise<string> = bundle({
  entryPoint: path.resolve(process.cwd(), 'remotion/index.ts'),
  webpackOverride: (config) => config,
}).then(url => {
  console.log('[remotion] bundle ready:', url)
  return url
}).catch(err => {
  console.error('[remotion] bundle failed:', err)
  throw err
})

export async function renderSubtitleVideo(
  props: Record<string, unknown>,
): Promise<string> {
  const serveUrl = await bundlePromise

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
    concurrency: 8,
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
