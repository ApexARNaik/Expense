export type Participant = { id: string; name: string }

export function calculateShares(amountPaise: number, participants: Participant[]): Record<string, number> {
  if (participants.length === 0) {
    throw new Error('At least one participant is required')
  }

  const isNegative = amountPaise < 0
  const absAmount = Math.abs(amountPaise)
  const baseShare = Math.floor(absAmount / participants.length)
  let remainder = absAmount % participants.length

  // Sort alphabetically by name to ensure stable distribution of remainder
  const sorted = [...participants].sort((a, b) => a.name.localeCompare(b.name))

  const shares: Record<string, number> = {}

  for (const p of sorted) {
    const extra = remainder > 0 ? 1 : 0
    const share = (baseShare + extra) * (isNegative ? -1 : 1)
    shares[p.id] = share
    if (remainder > 0) {
      remainder--
    }
  }

  return shares
}
