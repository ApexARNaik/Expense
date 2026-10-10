import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireMember } from '@/lib/session'
import * as xlsx from 'xlsx'
import { formatPaiseToAmount } from '@/lib/money'
import { getPeriodRange } from '@/lib/periods'

export async function GET(req: NextRequest) {
  try {
    await requireMember()
    
    const { searchParams } = new URL(req.url)
    
    // Parse filters
    let from = searchParams.get('from')
    let to = searchParams.get('to')
    const period = searchParams.get('period')
    const paidBy = searchParams.get('paidBy')
    const participant = searchParams.get('participant')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    
    if (period && period !== 'all_time') {
      const range = getPeriodRange(period)
      from = range.from
      to = range.to
    }
    
    const dateFilter: any = {}
    if (from) dateFilter.gte = from
    if (to) dateFilter.lte = to

    const whereClause: any = { deletedAt: null }
    if (from || to) {
      whereClause.expenseDate = dateFilter
    }
    if (paidBy) {
      whereClause.paidById = paidBy
    }
    if (category) {
      whereClause.category = category
    }
    if (search) {
      whereClause.title = { contains: search, mode: 'insensitive' }
    }
    if (participant) {
      whereClause.shares = {
        some: { memberId: participant }
      }
    }
    
    const expenses = await prisma.expense.findMany({
      where: whereClause,
      orderBy: { expenseDate: 'desc' },
      include: {
        paidBy: true,
        createdBy: true,
        shares: {
          include: { member: true }
        }
      }
    })

    const data = expenses.map(exp => {
      const isIncome = exp.amountPaise < 0
      const isSettle = exp.category === 'Settlement' || exp.category === 'Debt Payment'
      const amountRupees = parseFloat(formatPaiseToAmount(Math.abs(exp.amountPaise)))

      let type = 'Expense'
      if (isIncome) type = 'Income'
      if (isSettle) type = 'Settlement'

      const row: any = {
        'Date': exp.expenseDate,
        'Title': exp.title,
        'Type': type,
        'Category': exp.category || '',
        'Paid By': exp.paidBy.name,
        'Amount (₹)': isIncome ? amountRupees : -amountRupees, // Show expenses as negative or keep positive? Let's just output the exact amount where expense is positive and income is negative or vice versa. 
        // Wait, standard is Expense is positive, Income is negative in this app.
      }
      
      row['Amount (₹)'] = exp.amountPaise / 100

      row['Note'] = exp.note || ''
      row['Created By'] = exp.createdBy.name
      row['Created At'] = new Date(exp.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
      row['Recurring'] = exp.isRecurring ? 'Yes' : 'No'

      // Also include share breakdown? It might be useful.
      exp.shares.forEach(share => {
        row[`Share: ${share.member.name} (₹)`] = share.sharePaise / 100
      })

      return row
    })

    const worksheet = xlsx.utils.json_to_sheet(data)
    const workbook = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Expenses')

    const buf = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buf, {
      headers: {
        'Content-Disposition': 'attachment; filename="expenses_export.xlsx"',
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    })

  } catch (error: any) {
    console.error('Export error:', error)
    if (error.message === 'Unauthorized' || error.message === 'Unauthorized: Member not found') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
