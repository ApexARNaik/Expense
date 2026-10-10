import { z } from 'zod'

export const ExpenseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(80, 'Title cannot exceed 80 characters'),
  amountPaise: z.number().int().refine(val => val !== 0, {
    message: 'Amount must not be 0'
  }).refine(val => Math.abs(val) <= 100000000, {
    message: 'Amount cannot exceed ₹10,00,000'
  }),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  paidById: z.string().min(1, 'Paid by is required'),
  category: z.string().max(50).optional().nullable(),
  note: z.string().max(300, 'Note cannot exceed 300 characters').optional().nullable(),
  imageUrl: z.string().regex(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.webp$/i, 'Invalid image key').optional().nullable(),
  idempotencyKey: z.string().optional(),
  participantIds: z.array(z.string()).min(1, 'At least one participant is required').refine(
    (ids) => new Set(ids).size === ids.length,
    { message: 'Duplicate participants are not allowed' }
  ),
  isRecurring: z.boolean().optional()
})
