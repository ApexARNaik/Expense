import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireMember } from '@/lib/session'
import { ExpenseSchema } from '@/lib/schemas'
import { calculateShares } from '@/lib/split'
import { storage } from '@/lib/storage'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  let reqIdempotencyKey: string | undefined
  try {
    const currentMember = await requireMember()
    
    // Rate limit
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const allowed = await rateLimit(`write_exp_${ip}`, 50, 60 * 1000) // 50 requests per minute
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await req.json()
    const parsed = ExpenseSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.errors }, { status: 400 })
    }
    
    const data = parsed.data
    reqIdempotencyKey = data.idempotencyKey
    
    if (data.idempotencyKey) {
      const existing = await prisma.expense.findUnique({
        where: { idempotencyKey: data.idempotencyKey }
      })
      if (existing) {
        return NextResponse.json({ expense: existing, message: 'Returned existing due to idempotency key' })
      }
    }

    const members = await prisma.member.findMany({
      where: { 
        id: { in: Array.from(new Set([...data.participantIds, data.paidById])) } 
      }
    })
    
    // Validate participants
    const participants = members.filter(m => data.participantIds.includes(m.id))
    if (participants.length !== data.participantIds.length) {
      return NextResponse.json({ error: 'Invalid participant ids' }, { status: 400 })
    }

    // Validate paidBy
    if (!members.find(m => m.id === data.paidById)) {
      return NextResponse.json({ error: 'Invalid paidById' }, { status: 400 })
    }

    // Verify image exists if provided
    if (data.imageUrl) {
      try {
        await storage.getSignedOrAuthenticatedStream(data.imageUrl)
      } catch (e: any) {
        return NextResponse.json({ error: 'Image not found in storage' }, { status: 400 })
      }
    }

    const shares = calculateShares(data.amountPaise, participants.map(m => ({ id: m.id, name: m.name })))
    
    const sum = Object.values(shares).reduce((a, b) => a + b, 0)
    if (sum !== data.amountPaise) {
      return NextResponse.json({ error: 'Share split sum mismatch' }, { status: 500 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          title: data.title,
          amountPaise: data.amountPaise,
          expenseDate: data.expenseDate,
          category: data.category,
          note: data.note,
          imageUrl: data.imageUrl,
          idempotencyKey: data.idempotencyKey,
          paidBy: { connect: { id: data.paidById } },
          createdBy: { connect: { id: currentMember.id } },
          shares: {
            create: data.participantIds.map(memberId => ({
              memberId,
              sharePaise: shares[memberId]
            }))
          }
        },
        include: {
          shares: true,
          paidBy: true,
          createdBy: true
        }
      })
      
      const totalCreatedShares = expense.shares.reduce((a, b) => a + b.sharePaise, 0)
      if (totalCreatedShares !== expense.amountPaise) {
        throw new Error('Transaction aborted: Shares sum does not match amount')
      }
      
      return expense
    })

    return NextResponse.json({ expense: result })
  } catch (error: any) {
    if (error.code === 'P2002' && error.meta?.target?.includes('idempotencyKey')) {
      // Handle race condition: another request just inserted this key
      if (reqIdempotencyKey) {
        const existing = await prisma.expense.findUnique({
          where: { idempotencyKey: reqIdempotencyKey }
        })
        if (existing) {
          return NextResponse.json({ expense: existing, message: 'Returned existing due to idempotency key (concurrent)' })
        }
      }
    }
    if (error.message === 'Unauthorized' || error.message === 'Unauthorized: Member not found') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireMember()
    
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const take = 20
    const skip = (page - 1) * take

    const participant = searchParams.get('participant')
    const paidBy = searchParams.get('paidBy')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const where: any = { deletedAt: null }

    if (paidBy) where.paidById = paidBy
    if (category) where.category = category
    if (search) where.title = { contains: search } // Case insensitive by default in sqlite? wait, sqlite LIKE is case-insensitive
    
    if (from && to) {
      where.expenseDate = { gte: from, lte: to }
    } else if (from) {
      where.expenseDate = { gte: from }
    } else if (to) {
      where.expenseDate = { lte: to }
    }

    if (participant) {
      where.shares = {
        some: { memberId: participant }
      }
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { expenseDate: 'desc' }, // Reverse chronological by expenseDate makes more sense than createdAt
      take,
      skip,
      include: {
        shares: {
          include: { member: true }
        },
        paidBy: true,
        createdBy: true,
        updatedBy: true
      }
    })

    const totalCount = await prisma.expense.count({ where })
    
    return NextResponse.json({ 
      expenses,
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
