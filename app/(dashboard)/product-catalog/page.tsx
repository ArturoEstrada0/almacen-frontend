"use client"

import ProductCatalogPage from "@/components/catalog/ProductCatalogPage"
import { useAuth } from "@/lib/context/auth-context"

export default function Page() {
  const { role } = useAuth()

  return <ProductCatalogPage userRole={role || "viewer"} />
}