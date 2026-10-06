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
  return (Math.floor(paise) / 100).toFixed(2)
}

export function formatPaiseToIndianRupees(paise: number): string {
  const rs = Math.floor(paise) / 100
  return '₹' + rs.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
