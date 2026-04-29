import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { Analytics } from '@vercel/analytics/next'
import { siteConfig } from '@/config/site'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const title = `${siteConfig.name} — ${siteConfig.tagline}`

export const viewport: Viewport = {
  themeColor: '#7c3aed',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: title,
    template: `%s — ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: siteConfig.keywords,
  authors: [{ name: siteConfig.author.name, url: siteConfig.author.url }],
  creator: siteConfig.author.name,
  publisher: siteConfig.author.name,
  referrer: 'origin-when-cross-origin',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description: siteConfig.description,
    creator: siteConfig.twitterTag,
    site: siteConfig.twitterTag,
    images: [
      {
        url: siteConfig.ogImage,
        alt: siteConfig.name,
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  category: 'technology',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32' },
    ],
    apple: '/apple-touch-icon.svg',
  },
  manifest: '/manifest.json',
}

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      '@id': `${siteConfig.url}/#webapp`,
      name: siteConfig.name,
      url: siteConfig.url,
      description: siteConfig.description,
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Any',
      browserRequirements: 'Requires JavaScript. Requires HTML5.',
      isAccessibleForFree: true,
      inLanguage: 'vi',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'VND',
      },
      featureList: [
        'Tải video TikTok không logo/watermark',
        'Tải video YouTube và Shorts chất lượng HD',
        'Tải Instagram Reels, bài viết và tin (stories)',
        'Tải video và reels từ Facebook',
        'Tải video Twitter/X chất lượng HD',
        'Tải mẫu template CapCut',
        'Tách nhạc MP3 từ video',
        'Tải slideshow (photo carousels) kèm nhạc gốc',
        'Xem trước video và ảnh trước khi tải',
        'Lưu ảnh riêng lẻ hoặc nén thành file ZIP',
      ],
      screenshot: siteConfig.ogImage,
      author: {
        '@type': 'Person',
        name: siteConfig.author.name,
        url: siteConfig.author.url,
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '128',
        bestRating: '5',
        worstRating: '1',
      },
    },
    {
      '@type': 'FAQPage',
      '@id': `${siteConfig.url}/#faq`,
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Công cụ này có miễn phí không?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Có. Công cụ này hoàn toàn miễn phí, không cần đăng ký và không giới hạn lượt tải hàng ngày.',
          },
        },
        {
          '@type': 'Question',
          name: 'Hỗ trợ những nền tảng nào?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'TikTok, YouTube (video & shorts), Instagram (reels & bài viết), Facebook (video & reels), Twitter/X, và CapCut.',
          },
        },
        {
          '@type': 'Question',
          name: 'Video tải về có bị dính logo không?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Không. Video được lưu ở chất lượng HD và không có logo/watermark.',
          },
        },
        {
          '@type': 'Question',
          name: 'Tôi có thể tải YouTube Shorts không?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Có! Chỉ cần dán link YouTube Shorts và công cụ sẽ tải về với chất lượng HD.',
          },
        },
        {
          '@type': 'Question',
          name: 'Tôi có thể tải Instagram Reels không?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Có. Dán link Instagram Reels, bài viết hoặc story để tải video hoặc ảnh.',
          },
        },
        {
          '@type': 'Question',
          name: 'Tôi có thể tải bộ sưu tập ảnh (photo carousel) không?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Có. Dán link slideshow và ứng dụng sẽ hiển thị từng ảnh kèm nhạc nền gốc — bạn có thể tải từng ảnh, nén ZIP hoặc lưu nhạc MP3.',
          },
        },
      ],
    },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='vi'>
      <head>
        <link rel='icon' href='/favicon.svg' type='image/svg+xml' />
        <link rel='icon' href='/favicon.ico' sizes='32x32' />
        <link rel='apple-touch-icon' href='/apple-touch-icon.svg' />
        <link rel='manifest' href='/manifest.json' />
        <meta name='msapplication-TileColor' content='#7c3aed' />
        <meta name='google-adsense-account' content='ca-pub-3842960431278714' />
        <meta
          name='google-site-verification'
          content='aha64Aa3HDSFKw-xDlfpIGcBkGRU4lRV9xU-qR2SPwc'
        />
        <Script
          id='ld-json'
          type='application/ld+json'
          strategy='beforeInteractive'
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}`}
            crossOrigin='anonymous'
            strategy='afterInteractive'
          />
        )}
        {children}
        <Analytics />
      </body>
    </html>
  )
}
