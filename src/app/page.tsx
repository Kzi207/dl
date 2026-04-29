'use client'

import { useReducer, useRef, useState } from 'react'
import Image from 'next/image'
import { appReducer, initialState } from '@/lib/appReducer'
import {
  TikTokIcon,
  TwitterXIcon,
  YouTubeIcon,
  FacebookIcon,
  InstagramIcon,
  CapCutIcon,

  SpinnerIcon,
  DownloadIcon,
  MusicIcon,
  CheckIcon,
} from '@/components/icons'
import { AdBanner } from '@/components/AdBanner'
import { ImageLightbox } from '@/components/ImageLightbox'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'

export default function Home() {
  const [state, dispatch] = useReducer(appReducer, initialState)
  const containerRef = useRef<HTMLDivElement>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const handleProcess = async () => {
    if (!state.url.trim()) {
      dispatch({ type: 'SET_MESSAGE', payload: 'Please enter a URL' })
      return
    }

    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'RESET_DOWNLOAD_STATE' })

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: state.url,
          type: state.downloadType,
        }),
      })

      const data = await response.json()

      if (data.success) {
        dispatch({
          type: 'SET_DOWNLOAD_SUCCESS',
          payload: {
            downloadUrl: data.downloadUrl,
            audioUrl: data.audioUrl,
            metadata: data.metadata,
            originalUrl: state.url,
          },
        })

        // Clear the input after successful processing
        dispatch({ type: 'SET_URL', payload: '' })

        // Scroll to results section after successful processing
        setTimeout(() => {
          if (containerRef.current) {
            const resultsSection =
              containerRef.current.querySelector('.results-section')
            if (resultsSection) {
              resultsSection.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
              })
            }
          }
        }, 500)
      } else {
        dispatch({
          type: 'SET_MESSAGE',
          payload: data.error || 'Failed to process video',
        })
      }
    } catch (err) {
      console.error('Processing error:', err)
      dispatch({
        type: 'SET_MESSAGE',
        payload: 'An error occurred while processing the video',
      })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const handleVideoDownload = async () => {
    if (!state.downloadUrl) return

    dispatch({ type: 'SET_DOWNLOADING', payload: true })

    try {
      const response = await fetch(state.downloadUrl)

      if (!response.ok) {
        throw new Error('Failed to download video')
      }
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `social-video-${Date.now()}.mp4`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      URL.revokeObjectURL(blobUrl)

      dispatch({
        type: 'SET_MESSAGE',
        payload: 'Video downloaded successfully! 🎉',
      })
      // Clear the input after successful download
      dispatch({ type: 'SET_URL', payload: '' })
    } catch (error) {
      console.error('Download failed:', error)
      dispatch({
        type: 'SET_MESSAGE',
        payload: 'Failed to download video file',
      })
    } finally {
      dispatch({ type: 'SET_DOWNLOADING', payload: false })
    }
  }

  const handleSlideshowRender = async () => {
    const images = state.videoMetadata?.images
    const rawMusicUrl = state.videoMetadata?.rawMusicUrl
    if (!images || images.length === 0) return

    dispatch({ type: 'SET_DOWNLOADING', payload: true })
    dispatch({
      type: 'SET_MESSAGE',
      payload: 'Rendering slideshow video... this takes ~30 seconds.',
    })

    try {
      const response = await fetch('/api/slideshow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrls: images.map((img) => img.url),
          audioUrl: rawMusicUrl,
          perImageSeconds: 3,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to render slideshow')
      }

      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `tiktok-slideshow-${Date.now()}.mp4`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)

      dispatch({
        type: 'SET_MESSAGE',
        payload: 'Slideshow video rendered and downloaded! 🎬',
      })
      dispatch({ type: 'SET_URL', payload: '' })
    } catch (error) {
      console.error('Slideshow render failed:', error)
      dispatch({
        type: 'SET_MESSAGE',
        payload:
          error instanceof Error
            ? `Slideshow render failed: ${error.message}`
            : 'Failed to render slideshow video',
      })
    } finally {
      dispatch({ type: 'SET_DOWNLOADING', payload: false })
    }
  }
  const handleAudioDownload = async () => {
    if (!state.audioUrl) return

    dispatch({ type: 'SET_DOWNLOADING_AUDIO', payload: true })

    try {
      const response = await fetch(state.audioUrl)

      if (!response.ok) {
        throw new Error('Failed to download audio')
      }
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `social-audio-${Date.now()}.mp3`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      URL.revokeObjectURL(blobUrl)

      dispatch({
        type: 'SET_MESSAGE',
        payload: 'Audio downloaded successfully! 🎵',
      })
      // Clear the input after successful download
      dispatch({ type: 'SET_URL', payload: '' })
    } catch (error) {
      console.error('Audio download failed:', error)
      dispatch({
        type: 'SET_MESSAGE',
        payload: 'Failed to download audio file',
      })
    } finally {
      dispatch({ type: 'SET_DOWNLOADING_AUDIO', payload: false })
    }
  }
  const handleImageDownload = async () => {
    if (!state.videoMetadata?.images) return

    const selectedImages = state.videoMetadata.images.filter(
      (img) => img.selected,
    )

    if (selectedImages.length === 0) {
      dispatch({
        type: 'SET_MESSAGE',
        payload: 'Please select at least one image to download',
      })
      return
    }

    dispatch({ type: 'SET_DOWNLOADING_IMAGES', payload: true })

    try {
      const imageUrls = selectedImages.map((img) => img.url)

      // Only create ZIP if user explicitly chose it
      if (state.downloadImagesAsZip) {
        const response = await fetch('/api/images', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrls,
            title: state.videoMetadata.title,
            asZip: true,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to download images as ZIP')
        }
        const blob = await response.blob()
        const blobUrl = URL.createObjectURL(blob)

        const link = document.createElement('a')
        link.href = blobUrl
        link.download = `social-images-${Date.now()}.zip`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        URL.revokeObjectURL(blobUrl)

        dispatch({
          type: 'SET_MESSAGE',
          payload: `${selectedImages.length} image(s) downloaded as ZIP! 🗜️`,
        })
        // Clear the input after successful download
        dispatch({ type: 'SET_URL', payload: '' })
      } else {
        // Always download images individually (regardless of count)
        const response = await fetch('/api/images', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrls,
            asZip: false,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to get image download URLs')
        }

        const data = await response.json()

        if (!data.success || !data.images) {
          throw new Error('Invalid response from server')
        }

        // Download each image individually
        for (const imageData of data.images) {
          try {
            const imageResponse = await fetch(imageData.url)
            if (!imageResponse.ok) continue

            const blob = await imageResponse.blob()
            const blobUrl = URL.createObjectURL(blob)

            const link = document.createElement('a')
            link.href = blobUrl
            link.download = imageData.filename
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            URL.revokeObjectURL(blobUrl)

            // Small delay between downloads
            await new Promise((resolve) => setTimeout(resolve, 500))
          } catch (error) {
            console.error('Failed to download individual image:', error)
          }
        }
        dispatch({
          type: 'SET_MESSAGE',
          payload: `${selectedImages.length} image(s) downloaded individually! 🖼️`,
        })
        // Clear the input after successful download
        dispatch({ type: 'SET_URL', payload: '' })
      }
    } catch (error) {
      console.error('Image download failed:', error)
      dispatch({
        type: 'SET_MESSAGE',
        payload: 'Failed to download images',
      })
    } finally {
      dispatch({ type: 'SET_DOWNLOADING_IMAGES', payload: false })
    }
  }

  const toggleImageGallery = () => {
    dispatch({ type: 'TOGGLE_IMAGE_GALLERY' })
  }

  const toggleImageSelection = (imageId: string) => {
    dispatch({ type: 'TOGGLE_IMAGE_SELECTION', payload: imageId })
  }

  const selectAllImages = (selected: boolean) => {
    dispatch({ type: 'SELECT_ALL_IMAGES', payload: selected })
  }
  const togglePreview = () => {
    dispatch({ type: 'TOGGLE_PREVIEW' })
  }
  return (
    <div className='min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4'>
      <div
        ref={containerRef}
        className='w-full max-w-sm md:max-w-2xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl bg-white/10 backdrop-blur-lg rounded-2xl p-4 md:p-8 shadow-2xl border border-white/20'
      >
        {' '}
        {/* Header */}
        <div className='text-center mb-6 md:mb-8'>
          {' '}
          <div className='flex justify-center mb-4'>
            <div className='flex items-center space-x-2 md:space-x-3'>
              <div className='w-9 h-9 md:w-11 md:h-11 bg-[#010101] rounded-full flex items-center justify-center ring-2 ring-white/20 hover:scale-110 transition-transform' title='TikTok'>
                <TikTokIcon className='w-4 h-4 md:w-5 md:h-5 text-white' />
              </div>
              <div className='w-9 h-9 md:w-11 md:h-11 bg-[#FF0000] rounded-full flex items-center justify-center ring-2 ring-white/20 hover:scale-110 transition-transform' title='YouTube'>
                <YouTubeIcon className='w-4 h-4 md:w-5 md:h-5 text-white' />
              </div>
              <div className='w-9 h-9 md:w-11 md:h-11 bg-gradient-to-br from-[#f09433] via-[#dc2743] to-[#bc1888] rounded-full flex items-center justify-center ring-2 ring-white/20 hover:scale-110 transition-transform' title='Instagram'>
                <InstagramIcon className='w-4 h-4 md:w-5 md:h-5 text-white' />
              </div>
              <div className='w-9 h-9 md:w-11 md:h-11 bg-[#1877F2] rounded-full flex items-center justify-center ring-2 ring-white/20 hover:scale-110 transition-transform' title='Facebook'>
                <FacebookIcon className='w-4 h-4 md:w-5 md:h-5 text-white' />
              </div>
              <div className='w-9 h-9 md:w-11 md:h-11 bg-black rounded-full flex items-center justify-center ring-2 ring-white/20 hover:scale-110 transition-transform' title='Twitter/X'>
                <TwitterXIcon className='w-4 h-4 md:w-5 md:h-5 text-white' />
              </div>
              <div className='w-9 h-9 md:w-11 md:h-11 bg-[#00E5FF] rounded-full flex items-center justify-center ring-2 ring-white/20 hover:scale-110 transition-transform' title='CapCut'>
                <CapCutIcon className='w-4 h-4 md:w-5 md:h-5 text-black' />
              </div>
            </div>
          </div>
          <h1 className='text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2'>
            Trình Tải Video Đa Nền Tảng
          </h1>{' '}
          <p className='text-sm md:text-base text-white/70 mb-4'>
            Tải video từ TikTok, YouTube, Instagram, Facebook, Twitter/X &amp; CapCut — không logo, chất lượng HD
          </p>
          {/* Admin Link */}
          <div className='flex justify-center items-center mb-6'>
            <a
              href='https://facebook.com/kzi207'
              target='_blank'
              rel='noopener noreferrer'
              className='group flex items-center space-x-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 rounded-full transition-all duration-200 border border-blue-500/30 hover:border-blue-500/50'
            >
              <div className='w-2 h-2 bg-blue-400 rounded-full animate-pulse'></div>
              <span className='text-blue-200 group-hover:text-white text-sm font-medium transition-colors'>
                Admin: facebook.com/kzi207
              </span>
            </a>
          </div>
        </div>{' '}
        <div
          className={`grid gap-6 lg:gap-8 transition-all duration-300 ${
            state.videoMetadata && !state.showPreview && !state.showImageGallery
              ? 'grid-cols-1 xl:grid-cols-3'
              : 'grid-cols-1 lg:grid-cols-2'
          }`}
        >
          {' '}
          {/* Input Section */}
          <div className='space-y-4 xl:col-span-1'>
            <div>
              <input
                type='text'
                placeholder='Dán link TikTok, YouTube, IG, FB, X, hoặc CapCut tại đây...'
                value={state.url}
                onChange={(e) =>
                  dispatch({ type: 'SET_URL', payload: e.target.value })
                }
                className='w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm md:text-base'
              />
            </div>
            <AdBanner slot='1234567890' className='my-2' />
            {/* Download Type Selection */}
            {/* <div className='flex space-x-2'>
              <button
                onClick={() =>
                  dispatch({ type: 'SET_DOWNLOAD_TYPE', payload: 'video' })
                }
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 text-sm md:text-base ${
                  state.downloadType === 'video'
                    ? 'bg-gradient-to-r from-pink-500 to-violet-500 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                📹 Video
              </button>
              <button
                onClick={() =>
                  dispatch({ type: 'SET_DOWNLOAD_TYPE', payload: 'audio' })
                }
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 text-sm md:text-base ${
                  state.downloadType === 'audio'
                    ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                🎵 MP3
              </button>
            </div>{' '} */}
            <button
              onClick={handleProcess}
              disabled={
                state.loading ||
                state.downloading ||
                state.downloadingAudio ||
                state.downloadingImages
              }
              className='w-full cursor-pointer py-3 px-4 bg-gradient-to-r from-pink-500 to-violet-500 text-white font-semibold rounded-xl hover:from-pink-600 hover:to-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center text-sm md:text-base'
            >
              {' '}
              {state.loading ? (
                <>
                  <SpinnerIcon className='-ml-1 mr-3 h-4 w-4 md:h-5 md:w-5 text-white' />
                  Đang xử lý...
                </>
              ) : (
                <>Xử lý Link</>
              )}
            </button>{' '}
            {/* Features List - Hidden on mobile, shown on desktop */}
            <div className='hidden lg:block bg-white/5 rounded-xl p-4 mt-6 border border-white/10'>
              <h3 className='text-white font-semibold mb-4 text-sm md:text-base flex items-center'>
                ✨ Tính năng nổi bật
                <div className='ml-2 w-8 h-0.5 bg-gradient-to-r from-pink-500 to-violet-500 rounded'></div>
              </h3>
              <div className='grid grid-cols-1 xl:grid-cols-2 gap-3 text-xs md:text-sm'>
                <div className='flex items-center space-x-2 text-white/70 hover:text-white/90 transition-colors'>
                  <div className='w-2 h-2 bg-green-400 rounded-full'></div>
                  <span>Tải video không logo/watermark</span>
                </div>
                <div className='flex items-center space-x-2 text-white/70 hover:text-white/90 transition-colors'>
                  <div className='w-2 h-2 bg-blue-400 rounded-full'></div>
                  <span>Nhạc MP3 chất lượng cao</span>
                </div>
                <div className='flex items-center space-x-2 text-white/70 hover:text-white/90 transition-colors'>
                  <div className='w-2 h-2 bg-purple-400 rounded-full'></div>
                  <span>Tải ảnh Slide/Carousel TikTok</span>
                </div>
                <div className='flex items-center space-x-2 text-white/70 hover:text-white/90 transition-colors'>
                  <div className='w-2 h-2 bg-pink-400 rounded-full'></div>
                  <span>Hỗ trợ đa nền tảng (YT, FB, IG,...)</span>
                </div>
              </div>
            </div>
          </div>{' '}
          {/* Results Section */}
          <div
            className={`results-section space-y-4 ${
              state.videoMetadata &&
              !state.showPreview &&
              !state.showImageGallery
                ? 'xl:col-span-2'
                : ''
            }`}
          >
            {state.message && (
              <div
                className={`p-3 rounded-xl text-center transition-all duration-300 text-sm md:text-base ${
                  state.message.includes('success') ||
                  state.message.includes('🎉') ||
                  state.message.includes('🎵')
                    ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                    : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}
              >
                {state.message}
              </div>
            )}
            {!state.videoMetadata && !state.message && (
              <div className='space-y-4'>
                {/* Getting Started Card */}
                <div className='bg-gradient-to-br from-white/5 to-white/10 rounded-xl p-6 border border-white/20'>
                  <div className='text-center'>
                    <div className='w-16 h-16 bg-gradient-to-r from-pink-500/20 to-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-pink-500/30'>
                      <DownloadIcon className='w-8 h-8 text-pink-400' />
                    </div>
                    <h3 className='text-white font-semibold text-lg mb-2'>
                      Ready to Download?
                    </h3>
                    <p className='text-white/70 text-sm mb-4'>
                      Paste a URL from TikTok, YouTube, Instagram, Facebook, Twitter/X, or CapCut!
                    </p>
                  </div>
                </div>

                {/* How it Works */}
                <div className='bg-white/5 rounded-xl p-6 border border-white/10'>
                  <h3 className='text-white font-semibold mb-4 flex items-center'>
                    🚀 How it Works
                    <div className='ml-2 w-8 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded'></div>
                  </h3>
                  <div className='space-y-3'>
                    <div className='flex items-start space-x-3'>
                      <div className='w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5'>
                        1
                      </div>
                      <div>
                        <p className='text-white text-sm font-medium'>
                          Copy a Video URL
                        </p>
                        <p className='text-white/60 text-xs'>
                          From any supported platform
                        </p>
                      </div>
                    </div>
                    <div className='flex items-start space-x-3'>
                      <div className='w-6 h-6 bg-violet-500 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5'>
                        2
                      </div>
                      <div>
                        <p className='text-white text-sm font-medium'>
                          Paste & Process
                        </p>
                        <p className='text-white/60 text-xs'>
                          Our servers analyze the content
                        </p>
                      </div>
                    </div>
                    <div className='flex items-start space-x-3'>
                      <div className='w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5'>
                        3
                      </div>
                      <div>
                        <p className='text-white text-sm font-medium'>
                          Download Content
                        </p>
                        <p className='text-white/60 text-xs'>
                          Video, audio, or images - your choice!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Supported Formats */}
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div className='bg-white/5 rounded-xl p-4 border border-white/10'>
                    <h4 className='text-white font-medium mb-3 flex items-center'>
                      📱 Supported Platforms
                    </h4>
                    <div className='space-y-2 text-xs text-white/70'>
                      <p className='flex items-center gap-1.5'><TikTokIcon className='w-3 h-3 text-white/80' /> TikTok — videos, slideshows</p>
                      <p className='flex items-center gap-1.5'><YouTubeIcon className='w-3 h-3 text-red-400' /> YouTube — videos, shorts</p>
                      <p className='flex items-center gap-1.5'><InstagramIcon className='w-3 h-3 text-pink-400' /> Instagram — reels, posts</p>
                      <p className='flex items-center gap-1.5'><FacebookIcon className='w-3 h-3 text-blue-400' /> Facebook — videos, reels</p>
                      <p className='flex items-center gap-1.5'><TwitterXIcon className='w-3 h-3 text-white/80' /> Twitter/X — tweets, media</p>
                      <p className='flex items-center gap-1.5'><CapCutIcon className='w-3 h-3 text-cyan-400' /> CapCut — templates</p>
                    </div>
                  </div>
                  <div className='bg-white/5 rounded-xl p-4 border border-white/10'>
                    <h4 className='text-white font-medium mb-3 flex items-center'>
                      📊 Download Options
                    </h4>
                    <div className='space-y-2 text-xs text-white/70'>
                      <p>• HD Video (no watermark)</p>
                      <p>• MP3 Audio extraction</p>
                      <p>• Image galleries (ZIP/Individual)</p>
                      <p>• Preview before download</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {state.videoMetadata && (
              <div className='p-4 bg-white/10 rounded-xl border border-white/20 space-y-4'>
                <div className='flex items-start space-x-3'>
                  {state.videoMetadata.thumbnail && (
                    <Image
                      src={state.videoMetadata.thumbnail}
                      alt='Video thumbnail'
                      width={80}
                      height={80}
                      className='w-16 h-16 md:w-20 md:h-20 rounded-lg object-cover flex-shrink-0'
                      unoptimized
                    />
                  )}
                  <div className='flex-1 min-w-0'>
                    <h3 className='text-white font-medium text-sm md:text-base line-clamp-2'>
                      {state.videoMetadata.title}
                    </h3>
                    <p className='text-white/70 text-xs md:text-sm mt-1'>
                      by {state.videoMetadata.author}
                    </p>
                    {state.videoMetadata.duration > 0 && (
                      <p className='text-white/50 text-xs mt-1'>
                        {Math.floor(state.videoMetadata.duration / 60)}:
                        {(state.videoMetadata.duration % 60)
                          .toString()
                          .padStart(2, '0')}
                      </p>
                    )}
                    {state.originalUrl &&
                      (() => {
                        const platform = state.videoMetadata?.platform
                        const platformConfig: Record<string, { label: string; Icon: React.ComponentType<{ className?: string }>; color: string }> = {
                          tiktok: {
                            label: 'Xem trên TikTok',
                            Icon: TikTokIcon,
                            color: 'text-pink-400 hover:text-pink-300',
                          },
                          twitter: {
                            label: 'Xem trên Twitter/X',
                            Icon: TwitterXIcon,
                            color: 'text-sky-400 hover:text-sky-300',
                          },
                          youtube: {
                            label: 'Xem trên YouTube',
                            Icon: YouTubeIcon,
                            color: 'text-red-400 hover:text-red-300',
                          },
                          facebook: {
                            label: 'Xem trên Facebook',
                            Icon: FacebookIcon,
                            color: 'text-blue-400 hover:text-blue-300',
                          },
                          instagram: {
                            label: 'Xem trên Instagram',
                            Icon: InstagramIcon,
                            color: 'text-pink-400 hover:text-pink-300',
                          },
                          capcut: {
                            label: 'Xem trên CapCut',
                            Icon: CapCutIcon,
                            color: 'text-cyan-400 hover:text-cyan-300',
                          },
                          unknown: {
                            label: 'Xem link gốc',
                            Icon: DownloadIcon,
                            color: 'text-pink-400 hover:text-pink-300',
                          },
                        }
                        const cfg =
                          platformConfig[platform ?? 'unknown'] ??
                          platformConfig.unknown
                        return (
                          <a
                            href={state.originalUrl}
                            target='_blank'
                            rel='noopener noreferrer'
                            className={`inline-flex items-center gap-1 mt-2 text-xs transition-colors underline underline-offset-2 break-all ${cfg.color}`}
                          >
                            <cfg.Icon className='w-3 h-3 flex-shrink-0' />
                            {cfg.label}
                          </a>
                        )
                      })()}
                  </div>
                </div>
                {/* Preview Toggle (video only) */}
                {state.downloadUrl && (
                  <button
                    onClick={togglePreview}
                    className='w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center text-sm md:text-base'
                  >
                    {state.showPreview ? '👁️ Ẩn Xem Trước' : '👀 Xem Trước Video'}
                  </button>
                )}{' '}
                {/* Video Preview */}
                {state.showPreview && state.downloadUrl && (
                  <div className='space-y-3'>
                    <div className='bg-black rounded-xl overflow-hidden ring-1 ring-white/10 shadow-lg'>
                      <video
                        src={state.downloadUrl}
                        poster={state.videoMetadata?.thumbnail || undefined}
                        controls
                        playsInline
                        className='w-full h-auto max-h-[60vh] object-contain bg-black'
                        preload='metadata'
                        onError={(e) => {
                          console.error('Video preview error:', e)
                          dispatch({
                            type: 'SET_MESSAGE',
                            payload:
                              'Không thể xem trước, nhưng bạn vẫn có thể tải xuống',
                          })
                        }}
                      >
                        Trình duyệt của bạn không hỗ trợ thẻ video.
                      </video>
                    </div>
                    <p className='text-white/50 text-xs text-center'>
                      ⚡ Đã tải xem trước — sẵn sàng tải về!
                    </p>
                  </div>
                )}
                {/* Photo Carousel Audio Preview */}
                {state.videoMetadata?.isPhotoCarousel && state.audioUrl && (
                  <div className='space-y-3 bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-xl p-4 border border-white/10'>
                    <div className='flex items-center gap-2 text-white'>
                      <MusicIcon className='w-5 h-5 text-green-300' />
                      <div className='flex-1 min-w-0'>
                        <p className='text-sm font-semibold truncate'>
                          {state.videoMetadata.musicTitle ||
                            'Slideshow soundtrack'}
                        </p>
                        {state.videoMetadata.musicAuthor && (
                          <p className='text-xs text-white/60 truncate'>
                            by {state.videoMetadata.musicAuthor}
                          </p>
                        )}
                      </div>
                    </div>
                    <audio
                      src={state.audioUrl}
                      controls
                      preload='metadata'
                      className='w-full'
                    >
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}
                {/* Image Gallery */}
                {state.videoMetadata?.images &&
                  state.videoMetadata.images.length > 0 && (
                    <div className='space-y-3'>
                      <button
                        onClick={toggleImageGallery}
                        className='w-full py-2 px-4 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center text-sm md:text-base'
                      >
                        {state.showImageGallery
                          ? '🖼️ Ẩn Ảnh'
                          : `🖼️ Xem Ảnh (${state.videoMetadata.images.length})`}
                      </button>

                      {state.showImageGallery && (
                        <div className='space-y-3'>
                          {/* Select All Controls */}
                          <div className='flex items-center justify-between bg-white/5 rounded-lg p-3'>
                            <span className='text-white text-sm'>
                              Chọn ảnh để tải xuống:
                            </span>
                            <div className='flex space-x-2'>
                              <button
                                onClick={() => selectAllImages(true)}
                                className='px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded'
                              >
                                Tất cả
                              </button>
                              <button
                                onClick={() => selectAllImages(false)}
                                className='px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded'
                              >
                                Bỏ chọn
                              </button>
                            </div>
                          </div>

                          {/* Image Grid */}
                          <div className='grid grid-cols-2 md:grid-cols-3 gap-3'>
                            {state.videoMetadata.images.map((image, index) => (
                              <div
                                key={image.id}
                                className={`group relative rounded-lg overflow-hidden transition-all duration-200 ${
                                  image.selected
                                    ? 'ring-2 ring-pink-500'
                                    : 'hover:ring-2 hover:ring-white/30'
                                }`}
                              >
                                <button
                                  type='button'
                                  onClick={() => setLightboxIndex(index)}
                                  className='block w-full cursor-zoom-in'
                                  aria-label={`Open image ${index + 1} full size`}
                                >
                                  <Image
                                    src={image.thumbnail}
                                    alt={`Slideshow image ${index + 1}`}
                                    width={200}
                                    height={200}
                                    className='w-full h-24 md:h-32 object-cover transition-transform duration-200 group-hover:scale-105'
                                    unoptimized
                                  />
                                </button>

                                {/* Selection Toggle (separate from preview) */}
                                <button
                                  type='button'
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleImageSelection(image.id)
                                  }}
                                  aria-pressed={image.selected}
                                  aria-label={
                                    image.selected
                                      ? `Deselect image ${index + 1}`
                                      : `Select image ${index + 1}`
                                  }
                                  className={`absolute top-1 right-1 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200 backdrop-blur-sm ${
                                    image.selected
                                      ? 'bg-pink-500 border-pink-500'
                                      : 'bg-black/40 border-white/50 hover:border-white hover:bg-black/60'
                                  }`}
                                >
                                  {image.selected && (
                                    <CheckIcon className='w-4 h-4 text-white' />
                                  )}
                                </button>

                                {/* Image Number */}
                                <div className='absolute top-1 left-1 bg-black/60 text-white text-xs font-medium px-2 py-0.5 rounded'>
                                  {index + 1}
                                </div>

                                {/* Hover hint */}
                                <div className='pointer-events-none absolute bottom-1 left-1 right-1 text-[10px] text-white/80 bg-black/40 rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-center'>
                                  Click để xem ảnh
                                </div>
                              </div>
                            ))}{' '}
                          </div>

                          {/* Download Options */}
                          <div className='bg-white/5 rounded-lg p-3 space-y-3'>
                            <div className='flex items-center space-x-3'>
                              <input
                                type='checkbox'
                                id='downloadAsZip'
                                checked={state.downloadImagesAsZip}
                                onChange={(e) =>
                                  dispatch({
                                    type: 'SET_DOWNLOAD_IMAGES_AS_ZIP',
                                    payload: e.target.checked,
                                  })
                                }
                                className='w-4 h-4 text-pink-500 bg-white/10 border-white/30 rounded focus:ring-pink-500 focus:ring-2'
                              />
                              <label
                                htmlFor='downloadAsZip'
                                className='text-white text-sm cursor-pointer'
                              >
                                Tải xuống dạng file ZIP
                              </label>
                            </div>
                            <p className='text-white/60 text-xs'>
                              {state.downloadImagesAsZip
                                ? '🗜️ Các ảnh sẽ được nén vào một file ZIP'
                                : '📸 Các ảnh sẽ được tải xuống riêng lẻ'}
                            </p>
                          </div>

                          {/* Download Selected Images Button */}
                          <button
                            onClick={handleImageDownload}
                            disabled={
                              state.downloadingImages ||
                              !state.videoMetadata?.images?.some(
                                (img) => img.selected,
                              )
                            }
                            className='w-full cursor-pointer py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center text-sm md:text-base gap-2'
                          >
                            {' '}
                            {state.downloadingImages ? (
                              <>
                                <SpinnerIcon className='flex-shrink-0 h-4 w-4 text-white' />
                                <span>Đang tải...</span>
                              </>
                            ) : (
                              <>
                                <DownloadIcon className='flex-shrink-0 h-5 w-5 text-white' />
                                <span>
                                  Tải ảnh đã chọn (
                                  {state.videoMetadata?.images?.filter(
                                    (img) => img.selected,
                                  ).length || 0}
                                  )
                                </span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}{' '}
                {/* Download Buttons */}
                {(() => {
                  const hasImagesForSlideshow =
                    state.videoMetadata?.isPhotoCarousel &&
                    (state.videoMetadata?.images?.length ?? 0) > 0
                  const showVideoButton =
                    !!state.downloadUrl || hasImagesForSlideshow
                  const showAudioButton = !!state.audioUrl
                  if (!showVideoButton && !showAudioButton) return null
                  return (
                    <div className='space-y-4'>
                      <AdBanner slot='2345678901' className='my-2' />
                      <div
                        className={`grid gap-3 ${
                          showVideoButton && showAudioButton
                            ? 'grid-cols-1 md:grid-cols-2'
                            : 'grid-cols-1'
                        }`}
                      >
                      {showVideoButton && (
                        <button
                          onClick={
                            state.downloadUrl
                              ? handleVideoDownload
                              : handleSlideshowRender
                          }
                          disabled={
                            state.downloading || state.downloadingImages
                          }
                          className='py-3 cursor-pointer px-4 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center text-sm md:text-base gap-2'
                        >
                          {' '}
                          {state.downloading ? (
                            <>
                              <SpinnerIcon className='flex-shrink-0 h-4 w-4 text-white' />
                              <span>
                                {state.videoMetadata?.isPhotoCarousel &&
                                !state.downloadUrl
                                  ? 'Đang xử lý...'
                                  : 'Đang tải...'}
                              </span>
                            </>
                          ) : (
                            <>
                              <DownloadIcon className='flex-shrink-0 h-5 w-5 text-white' />
                              <span>
                                {state.videoMetadata?.isPhotoCarousel
                                  ? 'Tải Video (Slideshow)'
                                  : 'Tải Video'}
                              </span>
                            </>
                          )}
                        </button>
                      )}

                      {showAudioButton && (
                        <button
                          onClick={handleAudioDownload}
                          disabled={
                            state.downloadingAudio || state.downloadingImages
                          }
                          className='py-3 cursor-pointer px-4 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center text-sm md:text-base gap-2'
                        >
                          {' '}
                          {state.downloadingAudio ? (
                            <>
                              <SpinnerIcon className='flex-shrink-0 h-4 w-4 text-white' />
                              <span>Đang tải...</span>
                            </>
                          ) : (
                            <>
                              <MusicIcon className='flex-shrink-0 h-5 w-5 text-white' />
                              <span>
                                {state.videoMetadata?.isPhotoCarousel
                                  ? 'Tải Nhạc'
                                  : 'Tách Nhạc MP3'}
                              </span>
                            </>
                          )}
                        </button>
                      )}
                      </div>
                    </div>
                  )
                })()}
                {(state.downloadUrl || state.audioUrl) && (
                  <p className='text-white/50 text-xs text-center'>
                    {state.downloading ||
                    state.downloadingAudio ||
                    state.downloadingImages
                      ? 'Vui lòng đợi trong khi chúng tôi chuẩn bị file tải xuống...'
                      : 'Nhấn để tải nội dung của bạn'}
                  </p>
                )}
              </div>
            )}{' '}
          </div>
        </div>{' '}
        {/* Features List - Mobile only, shown at bottom */}
        <div className='lg:hidden bg-white/5 rounded-xl p-4 mt-6 border border-white/10'>
          <h3 className='text-white font-semibold mb-4 text-sm md:text-base flex items-center'>
            ✨ Tính Năng
            <div className='ml-2 w-8 h-0.5 bg-gradient-to-r from-pink-500 to-violet-500 rounded'></div>
          </h3>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-3 text-xs md:text-sm'>
            <div className='flex items-center space-x-2 text-white/70'>
              <div className='w-2 h-2 bg-green-400 rounded-full'></div>
              <span>Tải xuống không logo (Watermark)</span>
            </div>
            <div className='flex items-center space-x-2 text-white/70'>
              <div className='w-2 h-2 bg-blue-400 rounded-full'></div>
              <span>Giữ nguyên chất lượng HD</span>
            </div>
            <div className='flex items-center space-x-2 text-white/70'>
              <div className='w-2 h-2 bg-purple-400 rounded-full'></div>
              <span>Tách nhạc MP3 chất lượng cao</span>
            </div>
            <div className='flex items-center space-x-2 text-white/70'>
              <div className='w-2 h-2 bg-pink-400 rounded-full'></div>
              <span>Xem trước video</span>
            </div>
            <div className='flex items-center space-x-2 text-white/70'>
              <div className='w-2 h-2 bg-yellow-400 rounded-full'></div>
              <span>Tải bộ sưu tập ảnh</span>
            </div>
            <div className='flex items-center space-x-2 text-white/70'>
              <div className='w-2 h-2 bg-indigo-400 rounded-full'></div>
              <span>Hỗ trợ nhiều loại link</span>
            </div>
            <div className='flex items-center space-x-2 text-white/70'>
              <div className='w-2 h-2 bg-teal-400 rounded-full'></div>
              <span>Chọn ảnh hàng loạt</span>
            </div>
            <div className='flex items-center space-x-2 text-white/70'>
              <div className='w-2 h-2 bg-orange-400 rounded-full'></div>
              <span>Xử lý siêu nhanh</span>
            </div>
          </div>
        </div>
        {/* SEO Content: how-to + FAQ (mirrors JSON-LD FAQ schema) */}
        <section
          aria-labelledby='seo-heading'
          className='mt-10 space-y-6 text-white/80'
        >
          <div>
            <h2
              id='seo-heading'
              className='text-xl md:text-2xl font-bold text-white mb-3'
            >
              Trình Tải Video Đa Nền Tảng Miễn Phí
            </h2>
            <p className='text-sm md:text-base leading-relaxed'>
              Lưu video từ TikTok, YouTube, Instagram, Facebook, Twitter/X và CapCut chỉ với vài cú nhấp chuột. Dán
              link, xem trước nội dung và tải video chất lượng gốc,
              nhạc MP3 gốc hoặc từng hình ảnh từ bộ sưu tập ảnh.
              Mọi thứ diễn ra ngay trong trình duyệt của bạn — không cần ứng dụng, không cần đăng ký,
              không dính logo.
            </p>
          </div>

          <div className='grid md:grid-cols-3 gap-4'>
            <article className='bg-white/5 rounded-xl p-4 border border-white/10'>
              <h3 className='text-white font-semibold mb-2'>🎬 Video chất lượng HD</h3>
              <p className='text-sm'>
                Tải từ YouTube, TikTok, Instagram Reels, Facebook, Twitter/X và mẫu CapCut
                — tất cả ở chất lượng HD và không có logo.
              </p>
            </article>
            <article className='bg-white/5 rounded-xl p-4 border border-white/10'>
              <h3 className='text-white font-semibold mb-2'>
                🎵 Tách nhạc MP3
              </h3>
              <p className='text-sm'>
                Lấy nhạc nền từ bất kỳ video hoặc slideshow nào. Bộ sưu tập ảnh
                giữ nguyên nhạc nền gốc — hoàn hảo cho các âm thanh đang hot.
              </p>
            </article>
            <article className='bg-white/5 rounded-xl p-4 border border-white/10'>
              <h3 className='text-white font-semibold mb-2'>
                🖼️ Bộ sưu tập ảnh
              </h3>
              <p className='text-sm'>
                Slideshow TikTok và Instagram được hiển thị dưới dạng thư viện ảnh độ phân giải cao.
                Xem trước, chọn ảnh yêu thích, sau đó lưu riêng lẻ hoặc nén thành file ZIP.
              </p>
            </article>
          </div>

          <div>
            <h2 className='text-xl md:text-2xl font-bold text-white mb-3'>
              Câu hỏi thường gặp (FAQ)
            </h2>
            <Accordion
              type='single'
              collapsible
              defaultValue='faq-1'
              className='space-y-3'
            >
              <AccordionItem value='faq-1'>
                <AccordionTrigger>
                  Công cụ tải này có miễn phí không?
                </AccordionTrigger>
                <AccordionContent>
                  Có — hoàn toàn miễn phí, không cần đăng ký và không giới hạn lượt tải.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value='faq-2'>
                <AccordionTrigger>
                  Những nền tảng nào được hỗ trợ?
                </AccordionTrigger>
                <AccordionContent>
                  Chúng tôi hỗ trợ TikTok, YouTube (video &amp; shorts), Instagram (reels &amp; bài viết),
                  Facebook (video &amp; reels), Twitter/X, và các mẫu CapCut.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value='faq-3'>
                <AccordionTrigger>
                  Video tải về có bị dính logo không?
                </AccordionTrigger>
                <AccordionContent>
                  Không. Video được lưu ở chất lượng HD, không dính logo/watermark bất cứ khi nào có thể.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value='faq-4'>
                <AccordionTrigger>
                  Tôi có thể tải YouTube Shorts không?
                </AccordionTrigger>
                <AccordionContent>
                  Có! Chỉ cần dán link YouTube Shorts và công cụ sẽ tải về với chất lượng HD.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value='faq-5'>
                <AccordionTrigger>
                  Tôi có thể tải Instagram Reels không?
                </AccordionTrigger>
                <AccordionContent>
                  Có — dán bất kỳ link Instagram Reel, bài viết hoặc story nào để tải video hoặc ảnh.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value='faq-6'>
                <AccordionTrigger>Tôi có thể tải bộ sưu tập ảnh không?</AccordionTrigger>
                <AccordionContent>
                  Dán link slideshow. Ứng dụng sẽ liệt kê mọi hình ảnh, nhạc nền và — khi có sẵn — cả video slideshow đã dựng sẵn, vì vậy bạn có thể lấy ảnh, MP3 hoặc MP4 trong cùng một lần.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>
        {/* Ad Banner - Bottom of Page */}
        <AdBanner slot='0987654321' format='auto' className='mt-6' />
      </div>

      {lightboxIndex !== null && state.videoMetadata?.images && (
        <ImageLightbox
          images={state.videoMetadata.images}
          activeIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() =>
            setLightboxIndex((i) => {
              const total = state.videoMetadata?.images?.length ?? 0
              if (i === null || total === 0) return i
              return (i - 1 + total) % total
            })
          }
          onNext={() =>
            setLightboxIndex((i) => {
              const total = state.videoMetadata?.images?.length ?? 0
              if (i === null || total === 0) return i
              return (i + 1) % total
            })
          }
        />
      )}
    </div>
  )
}
