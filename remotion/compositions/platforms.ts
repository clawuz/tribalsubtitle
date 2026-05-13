export const PLATFORM_KEYS = [
  'instagram-reels',
  'instagram-story',
  'tiktok',
  'youtube-shorts',
  'facebook-reels',
  'linkedin',
  '1:1',
  '16:9',
  '9:16',
  'universal',
] as const

export type PlatformKey = typeof PLATFORM_KEYS[number]

export interface PlatformConfig {
  label: string
  w: number
  h: number
  safeTop: number
  safeBottom: number
  safeLeft: number
  safeRight: number
}

export const PLATFORMS: Record<PlatformKey, PlatformConfig> = {
  'instagram-reels': { label: 'Instagram Reels', w: 1080, h: 1920, safeTop: 250, safeBottom: 250, safeLeft: 35,  safeRight: 35  },
  'instagram-story': { label: 'Instagram Story', w: 1080, h: 1920, safeTop: 250, safeBottom: 300, safeLeft: 35,  safeRight: 35  },
  'tiktok':          { label: 'TikTok',           w: 1080, h: 1920, safeTop: 160, safeBottom: 480, safeLeft: 120, safeRight: 120 },
  'youtube-shorts':  { label: 'YouTube Shorts',   w: 1080, h: 1920, safeTop: 380, safeBottom: 380, safeLeft: 60,  safeRight: 120 },
  'facebook-reels':  { label: 'Facebook Reels',   w: 1080, h: 1920, safeTop: 250, safeBottom: 300, safeLeft: 35,  safeRight: 35  },
  'linkedin':        { label: 'LinkedIn',          w: 1080, h: 1920, safeTop: 100, safeBottom: 200, safeLeft: 40,  safeRight: 40  },
  '1:1':             { label: '1:1 Kare',          w: 1080, h: 1080, safeTop: 80,  safeBottom: 80,  safeLeft: 80,  safeRight: 80  },
  '16:9':            { label: '16:9 Yatay',        w: 1920, h: 1080, safeTop: 60,  safeBottom: 60,  safeLeft: 100, safeRight: 100 },
  '9:16':            { label: '9:16 Genel',        w: 1080, h: 1920, safeTop: 260, safeBottom: 260, safeLeft: 90,  safeRight: 90  },
  'universal':       { label: 'Evrensel',          w: 1080, h: 1920, safeTop: 260, safeBottom: 260, safeLeft: 90,  safeRight: 90  },
}

export const FONTS: { value: string; label: string }[] = [
  { value: 'TKTextVF, sans-serif',    label: 'TK Text' },
  { value: 'TKDISPLAYVF, sans-serif', label: 'TK Display' },
  { value: 'sans-serif',              label: 'System Sans' },
  { value: 'Inter',                   label: 'Inter' },
  { value: 'Poppins',                 label: 'Poppins' },
  { value: 'Roboto',                  label: 'Roboto' },
  { value: 'Montserrat',              label: 'Montserrat' },
  { value: 'Oswald',                  label: 'Oswald' },
  { value: 'Noto Sans',               label: 'Noto Sans' },
]
