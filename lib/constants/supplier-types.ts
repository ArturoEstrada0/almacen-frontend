export const SUPPLIER_TYPE_OPTIONS = [
  { value: "insumos", label: "Insumos" },
  { value: "fruta", label: "Fruta" },
  { value: "servicios", label: "Servicios" },
  { value: "transporte", label: "Transporte" },
  { value: "empaque", label: "Empaque" },
] as const

export type SupplierTypeValue = (typeof SUPPLIER_TYPE_OPTIONS)[number]["value"]

export function getSupplierTypeLabel(value?: string) {
  if (!value) return "Sin tipo"
  return SUPPLIER_TYPE_OPTIONS.find((option) => option.value === value)?.label || value
}
