// All date calculations assume Asia/Kolkata timezone conceptually.
// Since we only care about YYYY-MM-DD string representation, we format dates into YYYY-MM-DD in that timezone.

function getKolkataDate(date: Date) {
  const str = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
  return str // returns YYYY-MM-DD
}

export type Period = 'this_month' | 'last_month' | 'all_time' | string

export function getPeriodRange(period: Period): { from: string, to: string } {
  if (period === 'all_time') {
    return { from: '1970-01-01', to: '2099-12-31' }
  }

  const now = new Date()
  // Create a date object that represents "now" in Kolkata, then parse it back to a local date to do math safely
  const kolkataStr = getKolkataDate(now)
  const [yyyy, mm, dd] = kolkataStr.split('-').map(Number)

  let year = yyyy
  let month = mm

  if (period === 'last_month') {
    month -= 1
    if (month === 0) {
      month = 12
      year -= 1
    }
  } else if (period !== 'this_month') {
    // Expected format for specific month: YYYY-MM
    const match = period.match(/^(\d{4})-(\d{2})$/)
    if (match) {
      year = parseInt(match[1], 10)
      month = parseInt(match[2], 10)
    }
  }

  // Calculate the first and last day of the target month
  const from = `${year}-${month.toString().padStart(2, '0')}-01`
  // To get the last day, we can go to the 1st of the next month and subtract 1 day
  // But JS Date handles month overflow (e.g. month=13 becomes Jan next year) automatically!
  const nextMonth = new Date(year, month, 1) // month in JS Date is 0-indexed, so `month` is actually next month!
  nextMonth.setDate(0) // 0th day of next month is the last day of the target month
  
  const to = `${nextMonth.getFullYear()}-${(nextMonth.getMonth() + 1).toString().padStart(2, '0')}-${nextMonth.getDate().toString().padStart(2, '0')}`

  return { from, to }
}
