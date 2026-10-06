export function parseAmountToPaise(input: string): number {
  if (!input) return 0
  const clean = input.trim().replace(/,/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return 0
  
  const [rupees, paiseStr] = clean.split('.')
  let paise = 0
  
  if (paiseStr) {
    if (paiseStr.length === 1) {
      paise = parseInt(paiseStr + '0', 10)
    } else {
      paise = parseInt(paiseStr, 10)
    }
  }
  
  return parseInt(rupees, 10) * 100 + paise
}

export function formatPaiseToAmount(paise: number): string {
  return (paise / 100).toFixed(2)
}

export function formatPaiseToIndianRupees(paise: number): string {
  const isNegative = paise < 0
  const absRs = Math.abs(paise) / 100
  const formatted = absRs.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (isNegative ? '-₹' : '₹') + formatted
}
