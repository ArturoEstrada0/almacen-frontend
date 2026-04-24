export type ProductCatalogType = "productType" | "category"
export type ProductCatalogStatus = "active" | "inactive"

export interface ProductCatalogItem {
  id: number
  name: string
  description: string
  type: ProductCatalogType
  status: ProductCatalogStatus
}

export const PRODUCT_CATALOG_STORAGE_KEY = "almacen-product-catalog"

export const initialProductCatalog: ProductCatalogItem[] = [
  { id: 1, name: "Materiales", type: "category", description: "Insumos físicos", status: "active" },
  { id: 2, name: "Herramientas", type: "category", description: "Equipo de trabajo", status: "active" },
  { id: 3, name: "Insumo", type: "productType", description: "Producto de entrada", status: "active" },
  { id: 4, name: "Fruta", type: "productType", description: "Producto agrícola", status: "inactive" },
]

function isProductCatalogType(value: unknown): value is ProductCatalogType {
  return value === "productType" || value === "category"
}

function isProductCatalogStatus(value: unknown): value is ProductCatalogStatus {
  return value === "active" || value === "inactive"
}

export function normalizeProductCatalogItems(value: unknown): ProductCatalogItem[] {
  if (!Array.isArray(value)) {
    return initialProductCatalog
  }

  const items = value
    .map((item: any) => ({
      id: Number(item?.id),
      name: String(item?.name ?? "").trim(),
      description: String(item?.description ?? "").trim(),
      type: isProductCatalogType(item?.type) ? item.type : null,
      status: isProductCatalogStatus(item?.status) ? item.status : null,
    }))
    .filter((item): item is ProductCatalogItem => Boolean(item.id) && Boolean(item.name) && Boolean(item.type) && Boolean(item.status))

  return items.length > 0 ? items : initialProductCatalog
}

export function loadProductCatalog(): ProductCatalogItem[] {
  if (typeof window === "undefined") {
    return initialProductCatalog
  }

  try {
    const stored = window.localStorage.getItem(PRODUCT_CATALOG_STORAGE_KEY)
    if (!stored) {
      return initialProductCatalog
    }

    return normalizeProductCatalogItems(JSON.parse(stored))
  } catch {
    return initialProductCatalog
  }
}

export function saveProductCatalog(items: ProductCatalogItem[]) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(PRODUCT_CATALOG_STORAGE_KEY, JSON.stringify(items))
}

export function getActiveCatalogItems(
  items: ProductCatalogItem[] = loadProductCatalog(),
  type?: ProductCatalogType,
) {
  return items.filter((item) => item.status === "active" && (!type || item.type === type))
}