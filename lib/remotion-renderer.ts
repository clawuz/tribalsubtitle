import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import path from 'path'
import os from 'os'
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
  })
  return outPath
}
