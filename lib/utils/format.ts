export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(amount)
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("es-MX").format(num)
}

export function formatDate(date: Date | string): string {
  // Si es un string en formato YYYY-MM-DD, parsearlo localmente sin conversión UTC
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-').map(Number)
    const d = new Date(year, month - 1, day)
    return new Intl.DateTimeFormat("es-MX", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(d)
  }
  
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d)
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

export function getStockStatus(
  current: number,
  min: number,
  max: number,
): {
  status: "low" | "optimal" | "high"
  label: string
  color: string
} {
  if (current <= min) {
    return { status: "low", label: "Stock Bajo", color: "text-destructive" }
  }
  if (current >= max) {
    return { status: "high", label: "Stock Alto", color: "text-warning" }
  }
  return { status: "optimal", label: "Stock Óptimo", color: "text-success" }
}

export function getDaysUntilExpiration(expirationDate: Date): number {
  const today = new Date()
  const expDate = new Date(expirationDate)
  const diffTime = expDate.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export function getExpirationStatus(expirationDate: Date): {
  status: "expired" | "expiring-soon" | "good"
  label: string
  color: string
} {
  const days = getDaysUntilExpiration(expirationDate)

  if (days < 0) {
    return { status: "expired", label: "Vencido", color: "text-destructive" }
  }
  if (days <= 30) {
    return { status: "expiring-soon", label: "Por vencer", color: "text-warning" }
  }
  return { status: "good", label: "Vigente", color: "text-success" }
}
