const DATE_PREFIX_REGEX = /^(\d{4})-(\d{2})-(\d{2})/

const pad = (value: number) => String(value).padStart(2, "0")

export const getLocalDateInputValue = (date = new Date()): string => {
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  return `${year}-${month}-${day}`
}

export const parseDateOnly = (value?: string | Date | null): Date | null => {
  if (!value) return null
  if (value instanceof Date) return value

  const datePrefix = value.match(DATE_PREFIX_REGEX)
  if (datePrefix) {
    const year = Number(datePrefix[1])
    const month = Number(datePrefix[2])
    const day = Number(datePrefix[3])
    return new Date(year, month - 1, day, 12, 0, 0, 0)
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export const formatLocalDateOnly = (value?: string | Date | null): string => {
  const parsed = parseDateOnly(value)
  return parsed ? parsed.toLocaleDateString("es-MX") : "-"
}
