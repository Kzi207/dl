export type SupportedPlatform = 'tiktok' | 'twitter' | 'youtube' | 'facebook' | 'instagram' | 'capcut' | 'unknown'

const platformPatterns: Record<
  Exclude<SupportedPlatform, 'unknown'>,
  RegExp[]
> = {
  tiktok: [
    /^(https?:\/\/)?(www\.)?tiktok\.com\/@[\w.-]+\/video\/\d+/,
    /^(https?:\/\/)?(www\.)?tiktok\.com\/[\w.-]+\/video\/\d+/,
    /^(https?:\/\/)?vm\.tiktok\.com\/[\w\d]+/,
    /^(https?:\/\/)?vt\.tiktok\.com\/[\w\d]+/,
    /^(https?:\/\/)?m\.tiktok\.com\/v\/\d+/,
    /^(https?:\/\/)?(www\.)?tiktok\.com\/t\/[\w\d]+/,
  ],
  twitter: [
    /^(https?:\/\/)?(www\.)?(twitter|x)\.com\/[\w]+\/status\/\d+/,
    /^(https?:\/\/)?t\.co\/[\w\d]+/,
  ],
  youtube: [
    /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//,
    /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=[\w-]+/,
    /^(https?:\/\/)?(www\.)?youtube\.com\/shorts\/[\w-]+/,
    /^(https?:\/\/)?(www\.)?youtube\.com\/embed\/[\w-]+/,
    /^(https?:\/\/)?youtu\.be\/[\w-]+/,
    /^(https?:\/\/)?m\.youtube\.com\/watch\?v=[\w-]+/,
    /^(https?:\/\/)?music\.youtube\.com\/watch\?v=[\w-]+/,
  ],
  facebook: [
    /^(https?:\/\/)?(www\.|m\.|web\.)?facebook\.com\/.+\/videos\//,
    /^(https?:\/\/)?(www\.|m\.|web\.)?facebook\.com\/watch\//,
    /^(https?:\/\/)?(www\.|m\.|web\.)?facebook\.com\/reel\//,
    /^(https?:\/\/)?(www\.|m\.|web\.)?facebook\.com\/.+\/posts\//,
    /^(https?:\/\/)?(www\.|m\.|web\.)?facebook\.com\/share\//,
    /^(https?:\/\/)?fb\.watch\/[\w\d-]+/,
    /^(https?:\/\/)?(www\.|m\.)?facebook\.com\/[\w.]+\/videos\/\d+/,
  ],
  instagram: [
    /^(https?:\/\/)?(www\.)?instagram\.com\/p\/[\w-]+/,
    /^(https?:\/\/)?(www\.)?instagram\.com\/reel\/[\w-]+/,
    /^(https?:\/\/)?(www\.)?instagram\.com\/reels\/[\w-]+/,
    /^(https?:\/\/)?(www\.)?instagram\.com\/tv\/[\w-]+/,
    /^(https?:\/\/)?(www\.)?instagram\.com\/stories\/[\w.-]+\/\d+/,
  ],
  capcut: [
    /^(https?:\/\/)?(www\.)?capcut\.com\/t\/[\w-]+/,
    /^(https?:\/\/)?(www\.)?capcut\.com\/[\w-]+\/[\w-]+/,
  ],
}

export function detectPlatform(url: string): SupportedPlatform {
  if (!url || typeof url !== 'string') return 'unknown'
  const trimmed = url.trim()
  for (const [platform, patterns] of Object.entries(platformPatterns)) {
    if (patterns.some((p) => p.test(trimmed))) {
      return platform as SupportedPlatform
    }
  }
  return 'unknown'
}

export function validateUrl(url: string): boolean {
  return detectPlatform(url) !== 'unknown'
}

export function parseVideoId(url: string): string | null {
  const patterns = [
    /\/video\/(\d+)/,
    /\/v\/(\d+)/,
    /vm\.tiktok\.com\/([\w\d]+)/,
    /vt\.tiktok\.com\/([\w\d]+)/,
    /\/t\/([\w\d]+)/,
    /\/status\/(\d+)/,
    /\/p\/([\w-]+)/,
    /\/reel\/([\w-]+)/,
    /\/reels\/([\w-]+)/,
    /\/videos\/(\d+)/,
    /v=([\w-]+)/,
    /fb\.watch\/([\w\d-]+)/,
    /youtu\.be\/([\w-]+)/,
    /\/shorts\/([\w-]+)/,
    /\/embed\/([\w-]+)/,
    /\/watch\/(\d+)/,
    /\/tv\/([\w-]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

export function getPlatformLabel(platform: SupportedPlatform): string {
  const labels: Record<SupportedPlatform, string> = {
    tiktok: 'TikTok',
    twitter: 'Twitter/X',
    youtube: 'YouTube',
    facebook: 'Facebook',
    instagram: 'Instagram',
    capcut: 'CapCut',
    unknown: 'Unknown',
  }
  return labels[platform]
}
