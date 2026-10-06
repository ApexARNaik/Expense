import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/db'
import { encrypt } from '@/lib/session'
import { rateLimit } from '@/lib/rate-limit'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? req.ip ?? 'unknown'
  if (!rateLimit(ip, 10, 60000)) { // 10 requests per minute
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const { name, passphrase } = body

    if (process.env.HOUSE_PASSPHRASE) {
      if (!passphrase || !crypto.timingSafeEqual(
        Buffer.from(passphrase.padEnd(process.env.HOUSE_PASSPHRASE.length)),
        Buffer.from(process.env.HOUSE_PASSPHRASE.padEnd(process.env.HOUSE_PASSPHRASE.length))
      ) || passphrase.length !== process.env.HOUSE_PASSPHRASE.length) {
        return NextResponse.json({ error: 'Invalid passphrase' }, { status: 401 })
      }
    }

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const member = await prisma.member.findUnique({
      where: { name }
    })

    if (!member) {
      return NextResponse.json({ error: 'Unknown member' }, { status: 401 })
    }

    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const session = await encrypt({ name: member.name })

    const cookieStore = await cookies()
    cookieStore.set('expense-session', session, {
      expires,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Use 'lax' for general navigation but 'strict' if possible, lax is safer for local dev
      path: '/',
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
