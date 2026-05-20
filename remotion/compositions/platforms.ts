export const PLATFORM_KEYS = [
  'instagram-reels',
  'instagram-story',
  'tiktok',
  'youtube-shorts',
  'facebook-reels',
  'linkedin',
  '1:1',
  '4:5',
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
  // TikTok: top=profile bar(140), bottom=caption+nav+like area(420), right=action buttons(165)
  'tiktok':          { label: 'TikTok',           w: 1080, h: 1920, safeTop: 140, safeBottom: 420, safeLeft: 35,  safeRight: 165 },
  // Instagram Reels: top=username+follow(220), bottom=caption+engagement(450), right=buttons(120)
  'instagram-reels': { label: 'Instagram Reels',  w: 1080, h: 1920, safeTop: 220, safeBottom: 450, safeLeft: 35,  safeRight: 120 },
  // Instagram Story: top=profile(200), bottom=reply bar+stickers(350)
  'instagram-story': { label: 'Instagram Story',  w: 1080, h: 1920, safeTop: 200, safeBottom: 350, safeLeft: 40,  safeRight: 40  },
  // YouTube Shorts: top=search+menu(180), bottom=channel+title+music(350), right=like/share(120)
  'youtube-shorts':  { label: 'YouTube Shorts',   w: 1080, h: 1920, safeTop: 180, safeBottom: 350, safeLeft: 60,  safeRight: 120 },
  // Facebook Reels: similar to Instagram Reels
  'facebook-reels':  { label: 'Facebook Reels',   w: 1080, h: 1920, safeTop: 200, safeBottom: 380, safeLeft: 40,  safeRight: 40  },
  // LinkedIn: minimal UI overlay
  'linkedin':        { label: 'LinkedIn',          w: 1080, h: 1920, safeTop: 100, safeBottom: 220, safeLeft: 40,  safeRight: 40  },
  // Generic aspect ratios — use conservative middle-ground values
  '9:16':            { label: '9:16 Genel',        w: 1080, h: 1920, safeTop: 180, safeBottom: 420, safeLeft: 50,  safeRight: 150 },
  '4:5':             { label: '4:5 Dikey',         w: 1080, h: 1350, safeTop: 135, safeBottom: 135, safeLeft: 55,  safeRight: 55  },
  '1:1':             { label: '1:1 Kare',          w: 1080, h: 1080, safeTop: 65,  safeBottom: 65,  safeLeft: 65,  safeRight: 65  },
  '16:9':            { label: '16:9 Yatay',        w: 1920, h: 1080, safeTop: 60,  safeBottom: 80,  safeLeft: 80,  safeRight: 80  },
  'universal':       { label: 'Evrensel',          w: 1080, h: 1920, safeTop: 180, safeBottom: 420, safeLeft: 50,  safeRight: 150 },
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
