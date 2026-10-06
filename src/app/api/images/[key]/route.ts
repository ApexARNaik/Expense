import { NextRequest, NextResponse } from 'next/server'
import { requireMember } from '@/lib/session'
import { storage } from '@/lib/storage'
import path from 'path'

export async function GET(req: NextRequest, { params }: { params: { key: string } }) {
  try {
    const currentMember = await requireMember()
    if (!currentMember) return new NextResponse('Unauthorized', { status: 401 })

    const { key } = await params
    const decodedKey = decodeURIComponent(key)
    
    // Strict pattern matching to prevent path traversal
    const isUuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.webp$/i.test(decodedKey)
    const isVercelBlob = decodedKey.startsWith('https://') && decodedKey.includes('.public.blob.vercel-storage.com/')
    
    if (!isUuid && !isVercelBlob) {
      return new NextResponse('Not Found', { status: 404 })
    }

    try {
      const buffer = await storage.getSignedOrAuthenticatedStream(decodedKey)
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'image/webp',
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'private, max-age=86400',
        }
      })
    } catch (e: any) {
      if (e.code === 'ENOENT') {
        return new NextResponse('Not Found', { status: 404 })
      }
      throw e
    }
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Unauthorized: Member not found') {
      return new NextResponse('Unauthorized', { status: 401 })
    }
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
