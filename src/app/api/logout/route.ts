import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { requireMember } from '@/lib/session'

export async function POST() {
  await requireMember()
  const cookieStore = await cookies()
  cookieStore.set('expense-session', '', {
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })

  return NextResponse.json({ success: true })
}
