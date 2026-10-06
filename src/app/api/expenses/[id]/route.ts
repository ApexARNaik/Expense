import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireMember } from '@/lib/session'
import { ExpenseSchema } from '@/lib/schemas'
import { calculateShares } from '@/lib/split'
import { storage } from '@/lib/storage'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireMember()
    const { id } = await params
    
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        shares: {
          include: { member: true }
        },
        paidBy: true,
        createdBy: true,
        updatedBy: true
      }
    })

    if (!expense || expense.deletedAt) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    
    return NextResponse.json({ expense })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Unauthorized: Member not found') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentMember = await requireMember()
    const { id } = await params
    
    // Rate limit
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const allowed = await rateLimit(`write_exp_${ip}`, 50, 60 * 1000) // 50 requests per minute
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const existing = await prisma.expense.findUnique({ where: { id } })
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await req.json()
    const parsed = ExpenseSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.errors }, { status: 400 })
    }
    
    const data = parsed.data

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

    // Verify image exists if provided and changed
    if (data.imageUrl && data.imageUrl !== existing.imageUrl) {
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
      // delete existing shares
      await tx.expenseShare.deleteMany({ where: { expenseId: id } })
      
      const expense = await tx.expense.update({
        where: { id },
        data: {
          title: data.title,
          amountPaise: data.amountPaise,
          expenseDate: data.expenseDate,
          category: data.category,
          note: data.note,
          imageUrl: data.imageUrl,
          paidBy: { connect: { id: data.paidById } },
          updatedBy: { connect: { id: currentMember.id } },
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
          createdBy: true,
          updatedBy: true
        }
      })
      
      const totalUpdatedShares = expense.shares.reduce((a, b) => a + b.sharePaise, 0)
      if (totalUpdatedShares !== expense.amountPaise) {
        throw new Error('Transaction aborted: Shares sum does not match amount')
      }
      
      return expense
    })

    // If image changed, delete old one
    if (existing.imageUrl && existing.imageUrl !== data.imageUrl) {
      await storage.delete(existing.imageUrl).catch(console.error)
    }

    return NextResponse.json({ expense: result })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Unauthorized: Member not found') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentMember = await requireMember()
    const { id } = await params
    
    // Rate limit
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const allowed = await rateLimit(`write_exp_${ip}`, 50, 60 * 1000)
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const existing = await prisma.expense.findUnique({ where: { id } })
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.expense.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedById: currentMember.id
      }
    })

    // Note: Soft-deleted expenses keep their images in storage.
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Unauthorized: Member not found') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
