import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireMember } from '@/lib/session'

export async function GET(req: NextRequest) {
  try {
    await requireMember()
    
    const { searchParams } = new URL(req.url)
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')
    
    if (!fromDate || !toDate) {
      return NextResponse.json({ error: 'Missing from or to date' }, { status: 400 })
    }

    const expenses = await prisma.expense.findMany({
      where: { 
        deletedAt: null,
        expenseDate: {
          gte: fromDate,
          lte: toDate
        }
      },
      include: {
        shares: true
      }
    })

    const members = await prisma.member.findMany()
    const memberStats = Object.fromEntries(
      members.map(m => [m.id, { 
        totalPaise: 0,
        totalPaidPaise: 0,
        buckets: {
          sharedWithEveryone: 0,
          sharedWithSome: 0,
          personalOnly: 0
        }
      }])
    )

    let totalHouseSpendPaise = 0
    const totalMembers = members.length

    for (const expense of expenses) {
      const isSettlement = expense.category === 'Settlement' || expense.category === 'Debt Payment'
      
      if (!isSettlement) {
        totalHouseSpendPaise += expense.amountPaise
      }
      
      const participantCount = expense.shares.length
      const bucketName = participantCount === totalMembers ? 'sharedWithEveryone' :
                         participantCount === 1 ? 'personalOnly' : 'sharedWithSome'

      for (const share of expense.shares) {
        if (memberStats[share.memberId]) {
          memberStats[share.memberId].totalPaise += share.sharePaise
          if (!isSettlement) {
            memberStats[share.memberId].buckets[bucketName] += share.sharePaise
          }
        }
      }
      
      if (memberStats[expense.paidById]) {
        memberStats[expense.paidById].totalPaidPaise += expense.amountPaise
      }
    }

    return NextResponse.json({
      period: { from: fromDate, to: toDate },
      totalHouseSpendPaise,
      members: Object.entries(memberStats).map(([id, stats]) => ({
        id,
        ...stats,
        netBalancePaise: stats.totalPaidPaise - stats.totalPaise
      }))
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Unauthorized: Member not found') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
