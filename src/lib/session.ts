import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import prisma from './db'

function getKey() {
  const secretKey = process.env.SESSION_SECRET
  if (!secretKey || secretKey.length < 32) {
    throw new Error('SESSION_SECRET must be set in environment variables and be at least 32 characters long.')
  }
  return new TextEncoder().encode(secretKey)
}

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30 d')
    .sign(getKey())
}

export async function decrypt(input: string): Promise<any> {
  const { payload } = await jwtVerify(input, getKey(), {
    algorithms: ['HS256'],
  })
  return payload
}

export async function getSession() {
  const cookieStore = await cookies()
  const session = cookieStore.get('expense-session')?.value
  if (!session) return null
  try {
    return await decrypt(session)
  } catch (error) {
    return null
  }
}

export async function requireMember() {
  const session = await getSession()
  if (!session || !session.name) {
    throw new Error('Unauthorized')
  }

  const member = await prisma.member.findUnique({
    where: { name: session.name as string }
  })

  if (!member) {
    throw new Error('Unauthorized: Member not found')
  }

  return member
}
