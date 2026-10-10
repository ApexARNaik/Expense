export function addMonths(dateStr: string, months: number): string {
  const date = new Date(dateStr)
  date.setUTCMonth(date.getUTCMonth() + months)
  return date.toISOString().split('T')[0]
}
