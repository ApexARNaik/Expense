import { NextRequest, NextResponse } from 'next/server'
import { requireMember } from '@/lib/session'
import { rateLimit } from '@/lib/rate-limit'
import { fileTypeFromBuffer } from 'file-type'
import sharp from 'sharp'
import { v4 as uuidv4 } from 'uuid'
import { storage } from '@/lib/storage'
// @ts-ignore
import heicConvert from 'heic-convert'

export const maxDuration = 60
// Limit request body to 10MB
export const config = {
  api: {
    bodyParser: false,
    sizeLimit: '10mb'
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentMember = await requireMember()
    if (!currentMember) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Early Content-Length check
    const contentLength = req.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large, 10MB limit' }, { status: 413 })
    }

    // Basic rate limit
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const allowed = await rateLimit(`upload_${ip}`)
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    if (buffer.length > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large, 10MB limit' }, { status: 400 })
    }

    // Detect actual MIME type
    const type = await fileTypeFromBuffer(buffer)
    if (!type) {
      return NextResponse.json({ error: 'Unknown file type' }, { status: 400 })
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
    if (!allowedMimes.includes(type.mime)) {
      return NextResponse.json({ error: 'Unsupported file type. Only JPEG, PNG, WebP, and HEIC are allowed.' }, { status: 400 })
    }

    let imageBuffer = buffer

    // Handle HEIC fallback if sharp doesn't support it natively
    if (type.mime === 'image/heic' || type.mime === 'image/heif') {
      try {
        imageBuffer = await heicConvert({
          buffer: buffer,
          format: 'JPEG',
          quality: 1 // Highest quality intermediate
        })
      } catch (err) {
        console.error('HEIC conversion error:', err)
        return NextResponse.json({ error: 'Failed to process HEIC image' }, { status: 400 })
      }
    }

    // Process with sharp
    // rotate() auto-rotates based on EXIF orientation.
    // without() metadata essentially strips it (no withMetadata() call).
    const processedBuffer = await sharp(imageBuffer)
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: 'inside', // Do not enlarge
        withoutEnlargement: true
      })
      .webp({ quality: 80 })
      .toBuffer()

    const key = `${uuidv4()}.webp`
    const savedKeyOrUrl = await storage.put(key, processedBuffer, 'image/webp')

    return NextResponse.json({ key: savedKeyOrUrl })
  } catch (error: any) {
    console.error('Upload Error:', error)
    if (error.message === 'Unauthorized' || error.message === 'Unauthorized: Member not found') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Handle Vercel payload too large error (413) natively if it throws
    if (error.status === 413) {
      return NextResponse.json({ error: 'File too large, 10MB limit' }, { status: 413 })
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
