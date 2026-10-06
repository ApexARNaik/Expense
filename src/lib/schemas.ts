import { z } from 'zod'

export const ExpenseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(80, 'Title cannot exceed 80 characters'),
  amountPaise: z.number().int().positive('Amount must be greater than 0').max(100000000, 'Amount cannot exceed ₹10,00,000'), // max 10,00,000 INR = 10,00,000,00 paise
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  paidById: z.string().min(1, 'Paid by is required'),
  category: z.string().max(50).optional().nullable(),
  note: z.string().max(300, 'Note cannot exceed 300 characters').optional().nullable(),
  imageUrl: z.string().regex(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.webp$/i, 'Invalid image key').optional().nullable(),
  idempotencyKey: z.string().optional(),
  participantIds: z.array(z.string()).min(1, 'At least one participant is required').refine(
    (ids) => new Set(ids).size === ids.length,
    { message: 'Duplicate participants are not allowed' }
  )
})
