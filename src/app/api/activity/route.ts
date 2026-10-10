import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireMember } from '@/lib/session'

export async function GET(req: NextRequest) {
  try {
    const currentMember = await requireMember()
    
    // Only Atul can view this
    if (currentMember.name !== 'Atul') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const take = 50
    const skip = (page - 1) * take

    const logs = await prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: {
        member: true
      }
    })

    const totalCount = await prisma.activityLog.count()
    
    return NextResponse.json({ 
      logs,
      pagination: {
        total: totalCount,
        page,
        pages: Math.ceil(totalCount / take)
      }
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Unauthorized: Member not found') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
