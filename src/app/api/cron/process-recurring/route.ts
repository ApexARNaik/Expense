import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { addMonths } from '@/lib/date'

// This endpoint can be called by Vercel Cron or manually.
// It will find all ACTIVE recurring templates where nextRecurrenceDate <= today
// and generate the new expenses, then advance nextRecurrenceDate.

export async function GET(req: NextRequest) {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    // Find all templates that need processing
    const templates = await prisma.expense.findMany({
      where: {
        isRecurring: true,
        recurrenceStatus: 'ACTIVE',
        deletedAt: null,
        nextRecurrenceDate: {
          lte: today
        }
      },
      include: {
        shares: true
      }
    })

    let createdCount = 0

    for (const template of templates) {
      let currentDate = template.nextRecurrenceDate!
      let newNextDate = currentDate

      // We use a transaction per template to ensure consistency
      await prisma.$transaction(async (tx) => {
        // Double check it hasn't been updated
        const currentTemplate = await tx.expense.findUnique({
          where: { id: template.id }
        })

        if (!currentTemplate || currentTemplate.nextRecurrenceDate !== currentDate || currentTemplate.recurrenceStatus !== 'ACTIVE') {
          return // Skip if it was already processed concurrently
        }

        // Generate expenses until nextRecurrenceDate > today
        while (newNextDate <= today) {
          // Create the new expense
          await tx.expense.create({
            data: {
              title: template.title,
              amountPaise: template.amountPaise,
              expenseDate: newNextDate,
              category: template.category,
              note: template.note,
              paidById: template.paidById,
              createdById: template.createdById,
              parentRecurringId: template.id,
              shares: {
                create: template.shares.map(share => ({
                  memberId: share.memberId,
                  sharePaise: share.sharePaise
                }))
              }
            }
          })
          
          await tx.activityLog.create({
            data: {
              action: 'CREATE_EXPENSE_RECURRING',
              details: JSON.stringify({ title: template.title, amountPaise: template.amountPaise, date: newNextDate }),
              memberId: template.createdById
            }
          })

          createdCount++
          newNextDate = addMonths(newNextDate, 1)
        }

        // Update the template's nextRecurrenceDate
        await tx.expense.update({
          where: { id: template.id },
          data: {
            nextRecurrenceDate: newNextDate
          }
        })
      })
    }

    return NextResponse.json({ success: true, createdCount })
  } catch (error: any) {
    console.error('Error processing recurring expenses:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
