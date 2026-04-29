'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    adsbygoogle: unknown[]
  }
}

interface AdBannerProps {
  slot: string
  format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical'
  fullWidthResponsive?: boolean
  className?: string
}

export function AdBanner({
  slot,
  format = 'auto',
  fullWidthResponsive = true,
  className = '',
}: AdBannerProps) {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
  const pushedRef = useRef(false)

  useEffect(() => {
    if (!clientId || pushedRef.current) return
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      pushedRef.current = true
    } catch (err) {
      console.error('AdSense error:', err)
    }
  }, [clientId])

  if (!clientId) return null

  return (
    <div className={`${className} overflow-hidden bg-transparent`}>
      <ins
        className='adsbygoogle'
        style={{ display: 'block', background: 'transparent' }}
        data-ad-client={clientId}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={String(fullWidthResponsive)}
      />
    </div>
  )
}
