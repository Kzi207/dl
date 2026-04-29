import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import JSZip from 'jszip'

export async function POST(request: NextRequest) {
  try {
    const { imageUrls, title, asZip = false } = await request.json()

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No images provided' },
        { status: 400 }
      )
    }

    // If not downloading as ZIP, return the URLs for individual download
    if (!asZip) {
      return NextResponse.json({
        success: true,
        images: imageUrls.map((url: string, index: number) => ({
          url,
          filename: `tiktok-image-${index + 1}-${Date.now()}.jpg`,
        })),
      })
    }

    // If single image and asZip is true, still create ZIP
    if (imageUrls.length === 1 && asZip) {
      try {
        const response = await axios.get(imageUrls[0], {
          responseType: 'arraybuffer',
          timeout: 30000,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        })

        const zip = new JSZip()
        zip.file('tiktok-image-1.jpg', response.data)
        const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' })
        const zipName = title
          ? `${title.replace(/[^a-zA-Z0-9]/g, '_')}_images.zip`
          : `tiktok-images-${Date.now()}.zip`

        return new NextResponse(zipBuffer, {
          headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="${zipName}"`,
          },
        })
      } catch (error) {
        console.error('Error downloading single image:', error)
        return NextResponse.json(
          { success: false, error: 'Failed to download image' },
          { status: 500 }
        )
      }
    }

    // Multiple images - create ZIP
    const zip = new JSZip()
    const downloadPromises = imageUrls.map(
      async (url: string, index: number) => {
        try {
          const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 30000,
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          })

          const filename = `image-${index + 1}.jpg`
          zip.file(filename, response.data)
        } catch (error) {
          console.error(`Error downloading image ${index + 1}:`, error)
          // Add a placeholder for failed downloads
          zip.file(
            `image-${index + 1}-failed.txt`,
            `Failed to download: ${url}`
          )
        }
      }
    )

    await Promise.all(downloadPromises)

    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' })
    const zipName = title
      ? `${title.replace(/[^a-zA-Z0-9]/g, '_')}_images.zip`
      : `tiktok-images-${Date.now()}.zip`

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipName}"`,
      },
    })
  } catch (error) {
    console.error('Error creating image archive:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process images' },
      { status: 500 }
    )
  }
}
