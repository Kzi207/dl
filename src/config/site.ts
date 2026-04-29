export type SiteConfig = typeof siteConfig

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.mohamedgado.site'

export const siteConfig = {
  name: 'Trình Tải Video Đa Nền Tảng',
  shortName: 'Tải Video',
  tagline: 'Tải video từ TikTok, YouTube, Instagram, Facebook, X & CapCut',
  description:
    'Công cụ tải video miễn phí, nhanh chóng và không có logo từ TikTok, YouTube, Instagram, Facebook, Twitter/X và CapCut. Lưu video HD, tách nhạc MP3 và tải ảnh từ slideshow với âm thanh gốc — không cần đăng nhập hay cài đặt.',
  url: siteUrl,
  author: {
    name: 'Admin',
    url: 'https://facebook.com/kzi207',
    email: '',
    twitter: '',
  },
  links: {
    facebook: 'https://facebook.com/kzi207',
    github: 'https://github.com/Vette1123/tiktok-downloader',
  },
  ogImage: `${siteUrl}/og.jpg`,
  twitterTag: '',
  keywords: [
    'tải video tiktok',
    'tải video tiktok không logo',
    'tiktok downloader no watermark',
    'tải nhạc tiktok mp3',
    'tải video youtube',
    'tải video youtube shorts',
    'tải video instagram',
    'tải reels instagram',
    'tải video facebook',
    'tải reels facebook',
    'tải video twitter x',
    'tải video capcut',
    'trình tải video đa nền tảng',
    'tải video hd',
    'không watermark',
    'tải ảnh tiktok',
  ],
}
