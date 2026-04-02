"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/lib/context/auth-context"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import Spinner2 from "@/components/ui/spinner2"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/auth/login?returnUrl=${pathname}`)
    }
  }, [user, loading, router, pathname]);

  // Mostrar loading solo por un momento inicial
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner2 />
          <p className="text-muted-foreground">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  // Si no hay usuario después de cargar, no mostrar nada (se redirige en useEffect)
  if (!user) {
    return null
  }

  // Usuario autenticado, mostrar el dashboard
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-background p-6">{children}</main>
      </div>
    </div>
  )
}
