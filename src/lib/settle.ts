export interface Balance {
  id: string
  name: string
  netBalancePaise: number
}

export interface Settlement {
  fromId: string
  fromName: string
  toId: string
  toName: string
  amountPaise: number
}

export function calculateSettlements(balances: Balance[]): Settlement[] {
  // Filter out 0 balances and sort by ascending net balance (most negative first)
  const sortedBalances = balances
    .map(b => ({ ...b })) // clone so we can mutate safely
    .filter(b => b.netBalancePaise !== 0)
    .sort((a, b) => {
      if (a.netBalancePaise !== b.netBalancePaise) {
        return a.netBalancePaise - b.netBalancePaise
      }
      return a.name.localeCompare(b.name)
    })

  const settlements: Settlement[] = []
  
  let i = 0
  let j = sortedBalances.length - 1

  while (i < j) {
    const debtor = sortedBalances[i]
    const creditor = sortedBalances[j]
    
    const amount = Math.min(-debtor.netBalancePaise, creditor.netBalancePaise)
    
    if (amount > 0) {
      settlements.push({
        fromId: debtor.id,
        fromName: debtor.name,
        toId: creditor.id,
        toName: creditor.name,
        amountPaise: amount
      })
    }
    
    debtor.netBalancePaise += amount
    creditor.netBalancePaise -= amount
    
    if (debtor.netBalancePaise === 0) i++
    if (creditor.netBalancePaise === 0) j--
  }

  return settlements
}
