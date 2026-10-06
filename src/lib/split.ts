export type Participant = { id: string; name: string }

export function calculateShares(amountPaise: number, participants: Participant[]): Record<string, number> {
  if (participants.length === 0) {
    throw new Error('At least one participant is required')
  }

  const baseShare = Math.floor(amountPaise / participants.length)
  let remainder = amountPaise % participants.length

  // Sort alphabetically by name to ensure stable distribution of remainder
  const sorted = [...participants].sort((a, b) => a.name.localeCompare(b.name))

  const shares: Record<string, number> = {}

  for (const p of sorted) {
    shares[p.id] = baseShare + (remainder > 0 ? 1 : 0)
    if (remainder > 0) {
      remainder--
    }
  }

  return shares
}
